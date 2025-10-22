'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface InputData {
  [key: string]: number | string;
}

interface InputGroup {
  label: string;
  value: number | string;
}

interface GroupedInputs {
  [groupName: string]: InputGroup[];
}

interface CalculationData {
  inputs: InputData;
  unitEconomics: InputData;
  pl: InputData;
}

export default function Home() {
  const [data, setData] = useState<CalculationData | null>(null);
  const [inputGroups, setInputGroups] = useState<GroupedInputs>({});
  const [inputs, setInputs] = useState<InputData>({});
  const [unitEconomics, setUnitEconomics] = useState<InputData>({});
  const [pl, setPl] = useState<InputData>({});
  const [activeTab, setActiveTab] = useState('inputs');

  useEffect(() => {
    // Load grouped data
    fetch('/data-grouped.json')
      .then(res => res.json())
      .then(jsonData => {
        setInputGroups(jsonData.inputGroups);
        // Flatten grouped inputs into a single object
        const flatInputs: InputData = {};
        Object.values(jsonData.inputGroups).forEach((group: any) => {
          (group as InputGroup[]).forEach((item: InputGroup) => {
            flatInputs[item.label] = item.value;
          });
        });
        setInputs(flatInputs);
      })
      .catch(err => console.error('Error loading grouped data:', err));

    // Load calculation data
    fetch('/data.json')
      .then(res => res.json())
      .then(jsonData => {
        setData(jsonData);
        setUnitEconomics(jsonData.unitEconomics);
        setPl(jsonData.pl);
      })
      .catch(err => console.error('Error loading data:', err));
  }, []);

  const handleInputChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  const calculateMetrics = () => {
    // Recalculate based on new inputs
    const newInputs = inputs;
    
    // Unit Economics calculations
    const cuotaBase = newInputs['Cuota mensual por cliente (pack base)'] as number || 25;
    const horasVozExceso = (newInputs['Horas VOZ consumidas/cliente'] as number || 1.2) - (newInputs['Horas VOZ incluidas por cliente'] as number || 0.5);
    const horasHumanoExceso = (newInputs['Horas HUMANO consumidas/cliente'] as number || 0.2) - (newInputs['Horas HUMANO incluidas por cliente'] as number || 0);
    const mensajesExceso = ((newInputs['Mensajes consumidos/cliente'] as number || 1200) - (newInputs['Mensajes incluidos por cliente'] as number || 200)) / 100000;
    
    const precioVozExceso = newInputs['Precio hora VOZ (exceso) – a definir'] as number || 6;
    const precioHumanoExceso = newInputs['Precio hora HUMANO (exceso) – a definir'] as number || 12;
    const precioPor100kMensajes = newInputs['Precio por 100.000 mensajes (exceso)'] as number || 120;
    
    const ingresosExcesoVoz = horasVozExceso * precioVozExceso;
    const ingresosExcesoHumano = horasHumanoExceso * precioHumanoExceso;
    const ingresosExcesoMensajes = mensajesExceso * precioPor100kMensajes;
    
    const ingresoTotal = cuotaBase + ingresosExcesoVoz + ingresosExcesoHumano + ingresosExcesoMensajes;
    
    const costeVoz = (newInputs['Horas VOZ consumidas/cliente'] as number || 1.2) * (newInputs['Coste hora de operación VOZ (IA)'] as number || 4);
    const costeHumano = (newInputs['Horas HUMANO consumidas/cliente'] as number || 0.2) * (newInputs['Coste hora de operación HUMANO'] as number || 8);
    const costeMensajes = ((newInputs['Mensajes consumidos/cliente'] as number || 1200) / 10000) * (newInputs['Coste mensajes (pack 10.000)'] as number || 70);
    const costeSoporte = newInputs['Coste fijo mensual soporte por cliente'] as number || 1;
    
    const costeTotal = costeVoz + costeHumano + costeMensajes + costeSoporte;
    const margenCliente = ingresoTotal - costeTotal;
    const margenPorcentaje = (margenCliente / ingresoTotal) * 100;
    
    const newUnitEconomics = {
      'Cuota base': cuotaBase,
      'Ingresos exceso VOZ': ingresosExcesoVoz,
      'Ingresos exceso HUMANO': ingresosExcesoHumano,
      'Ingresos exceso MENSAJES': ingresosExcesoMensajes,
      'Ingreso total/cliente': ingresoTotal,
      'Coste VOZ': costeVoz,
      'Coste HUMANO': costeHumano,
      'Coste MENSAJES': costeMensajes,
      'Coste soporte/cliente': costeSoporte,
      'Coste total/cliente': costeTotal,
      'Margen €/cliente': margenCliente,
      'Margen % sobre ingresos': margenPorcentaje,
    };
    
    // P&L calculations
    const clientes = newInputs['Clientes (volumen)'] as number || 1000;
    const ingresoTotalMes = ingresoTotal * clientes;
    const costeTotalMes = costeTotal * clientes;
    const margenBruto = ingresoTotalMes - costeTotalMes;
    const overheadFijo = newInputs['Overhead fijo mensual Telefónica'] as number || 10000;
    const margenNeto = margenBruto - overheadFijo;
    const margenNetoPorcentaje = (margenNeto / ingresoTotalMes) * 100;
    
    const newPl = {
      'Clientes': clientes,
      'Ingreso total (mes)': ingresoTotalMes,
      'Coste total (mes)': costeTotalMes,
      'Margen bruto (mes)': margenBruto,
      'Overhead fijo mensual': overheadFijo,
      'Margen neto (mes)': margenNeto,
      'Margen neto % sobre ingresos': margenNetoPorcentaje,
    };
    
    setUnitEconomics(newUnitEconomics);
    setPl(newPl);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Chart data
  const ingresosPorCliente = [
    {
      name: 'Cuota base',
      value: Math.max(0, unitEconomics['Cuota base'] as number || 0),
    },
    {
      name: 'Exceso VOZ',
      value: Math.max(0, unitEconomics['Ingresos exceso VOZ'] as number || 0),
    },
    {
      name: 'Exceso HUMANO',
      value: Math.max(0, unitEconomics['Ingresos exceso HUMANO'] as number || 0),
    },
    {
      name: 'Exceso MENSAJES',
      value: Math.max(0, unitEconomics['Ingresos exceso MENSAJES'] as number || 0),
    },
  ];

  const costesPorCliente = [
    {
      name: 'Coste VOZ',
      value: Math.max(0, unitEconomics['Coste VOZ'] as number || 0),
    },
    {
      name: 'Coste HUMANO',
      value: Math.max(0, unitEconomics['Coste HUMANO'] as number || 0),
    },
    {
      name: 'Coste MENSAJES',
      value: Math.max(0, unitEconomics['Coste MENSAJES'] as number || 0),
    },
    {
      name: 'Coste Soporte',
      value: Math.max(0, unitEconomics['Coste soporte/cliente'] as number || 0),
    },
  ];

  const margenData = [
    {
      name: 'Ingresos',
      value: Math.max(0, unitEconomics['Ingreso total/cliente'] as number || 0),
    },
    {
      name: 'Costes',
      value: Math.max(0, unitEconomics['Coste total/cliente'] as number || 0),
    },
    {
      name: 'Margen',
      value: Math.max(0, unitEconomics['Margen €/cliente'] as number || 0),
    },
  ];

  const plData = [
    {
      name: 'Ingresos',
      value: Math.max(0, pl['Ingreso total (mes)'] as number || 0),
    },
    {
      name: 'Costes',
      value: Math.max(0, pl['Coste total (mes)'] as number || 0),
    },
    {
      name: 'Margen Bruto',
      value: Math.max(0, pl['Margen bruto (mes)'] as number || 0),
    },
  ];

  const plDetalleData = [
    {
      name: 'Margen Bruto',
      value: Math.max(0, pl['Margen bruto (mes)'] as number || 0),
    },
    {
      name: 'Overhead',
      value: Math.max(0, pl['Overhead fijo mensual'] as number || 0),
    },
    {
      name: 'Margen Neto',
      value: Math.max(0, pl['Margen neto (mes)'] as number || 0),
    },
  ];

  // Break-even calculation
  const margenPorCliente = unitEconomics['Margen €/cliente'] as number || 0;
  const overheadFijo = pl['Overhead fijo mensual'] as number || 10000;
  const breakEvenClientes = margenPorCliente > 0 ? Math.ceil(overheadFijo / margenPorCliente) : 0;
  const clientesActuales = pl['Clientes'] as number || 1000;
  const clientesExceso = Math.max(0, clientesActuales - breakEvenClientes);

  const breakEvenChartData = [
    {
      name: 'Break-Even',
      value: breakEvenClientes,
    },
    {
      name: 'Actual',
      value: clientesActuales,
    },
  ];

  const COLORS = ['#6D6DB3', '#B1B1B0', '#E4E3E3', '#3F3F3F'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Business Case Calculator</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Análisis de rentabilidad y proyecciones financieras</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-0 rounded-none border-b border-border bg-transparent px-4 sm:px-6">
            <TabsTrigger value="inputs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs sm:text-sm">
              Parámetros
            </TabsTrigger>
            <TabsTrigger value="uniteconomics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs sm:text-sm">
              Unit Econ
            </TabsTrigger>
            <TabsTrigger value="pl" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary text-xs sm:text-sm">
              P&L
            </TabsTrigger>
          </TabsList>

          {/* Inputs Tab */}
          <TabsContent value="inputs" className="space-y-4 p-4 sm:p-6">
            {Object.entries(inputGroups).map(([groupName, groupItems]) => (
              <Card key={groupName} className="border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg text-primary">{groupName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupItems.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <Label htmlFor={item.label} className="text-xs sm:text-sm font-medium">
                        {item.label}
                      </Label>
                      <Input
                        id={item.label}
                        type="number"
                        value={inputs[item.label] || ''}
                        onChange={(e) => handleInputChange(item.label, e.target.value)}
                        className="w-full text-sm"
                        step="0.01"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            
            <div className="flex justify-center pt-2">
              <Button 
                onClick={calculateMetrics}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 text-sm sm:text-base w-full sm:w-auto"
              >
                Calcular Métricas
              </Button>
            </div>
          </TabsContent>

          {/* Unit Economics Tab */}
          <TabsContent value="uniteconomics" className="space-y-4 p-4 sm:p-6">
            {/* Summary Cards */}
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Ingresos por Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm py-1">
                    <span>Cuota base</span>
                    <span className="font-semibold text-primary">{formatCurrency(unitEconomics['Cuota base'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm py-1">
                    <span>Exceso VOZ</span>
                    <span className="font-semibold text-primary">{formatCurrency(unitEconomics['Ingresos exceso VOZ'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm py-1">
                    <span>Exceso HUMANO</span>
                    <span className="font-semibold text-primary">{formatCurrency(unitEconomics['Ingresos exceso HUMANO'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm py-1">
                    <span>Exceso MENSAJES</span>
                    <span className="font-semibold text-primary">{formatCurrency(unitEconomics['Ingresos exceso MENSAJES'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm py-2 bg-accent/10 px-2 rounded border-t border-border">
                    <span className="font-semibold">Total Ingresos</span>
                    <span className="font-bold text-primary">{formatCurrency(unitEconomics['Ingreso total/cliente'] as number || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Costes por Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm py-1">
                    <span>Coste VOZ</span>
                    <span className="font-semibold text-secondary">{formatCurrency(unitEconomics['Coste VOZ'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm py-1">
                    <span>Coste HUMANO</span>
                    <span className="font-semibold text-secondary">{formatCurrency(unitEconomics['Coste HUMANO'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm py-1">
                    <span>Coste MENSAJES</span>
                    <span className="font-semibold text-secondary">{formatCurrency(unitEconomics['Coste MENSAJES'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm py-1">
                    <span>Coste Soporte</span>
                    <span className="font-semibold text-secondary">{formatCurrency(unitEconomics['Coste soporte/cliente'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm py-2 bg-accent/10 px-2 rounded border-t border-border">
                    <span className="font-semibold">Total Costes</span>
                    <span className="font-bold text-secondary">{formatCurrency(unitEconomics['Coste total/cliente'] as number || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base text-primary">Margen por Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm">Margen (€)</span>
                    <span className="text-lg sm:text-2xl font-bold text-primary">{formatCurrency(unitEconomics['Margen €/cliente'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm">Margen (%)</span>
                    <span className="text-lg sm:text-2xl font-bold text-primary">{formatNumber(unitEconomics['Margen % sobre ingresos'] as number || 0)}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="space-y-4 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Desglose de Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={ingresosPorCliente}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ingresosPorCliente.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Desglose de Costes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={costesPorCliente}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {costesPorCliente.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Comparativa: Ingresos vs Costes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={margenData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="value" fill="#6D6DB3" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* P&L Tab */}
          <TabsContent value="pl" className="space-y-4 p-4 sm:p-6">
            {/* Summary Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">P&L Mensual - Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-card border border-border rounded">
                    <p className="text-xs text-muted-foreground mb-1">Clientes</p>
                    <p className="text-lg sm:text-xl font-bold text-foreground">{formatNumber(pl['Clientes'] as number || 0)}</p>
                  </div>
                  <div className="p-3 bg-card border border-border rounded">
                    <p className="text-xs text-muted-foreground mb-1">Ingresos (mes)</p>
                    <p className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(pl['Ingreso total (mes)'] as number || 0)}</p>
                  </div>
                  <div className="p-3 bg-card border border-border rounded">
                    <p className="text-xs text-muted-foreground mb-1">Costes (mes)</p>
                    <p className="text-lg sm:text-xl font-bold text-secondary">{formatCurrency(pl['Coste total (mes)'] as number || 0)}</p>
                  </div>
                  <div className="p-3 bg-card border border-border rounded">
                    <p className="text-xs text-muted-foreground mb-1">Overhead</p>
                    <p className="text-lg sm:text-xl font-bold text-secondary">{formatCurrency(pl['Overhead fijo mensual'] as number || 0)}</p>
                  </div>
                </div>

                <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Margen Bruto</h3>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm">Valor (€)</span>
                    <span className="text-base sm:text-lg font-bold text-primary">{formatCurrency(pl['Margen bruto (mes)'] as number || 0)}</span>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-primary">Margen Neto</h3>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm">Valor (€)</span>
                    <span className="text-base sm:text-lg font-bold text-primary">{formatCurrency(pl['Margen neto (mes)'] as number || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm">Margen (%)</span>
                    <span className="text-base sm:text-lg font-bold text-primary">{formatNumber(pl['Margen neto % sobre ingresos'] as number || 0)}%</span>
                  </div>
                </div>

                <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Break-Even Analysis</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Clientes Break-Even</p>
                      <p className="text-lg font-bold text-secondary">{breakEvenClientes}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Clientes Actuales</p>
                      <p className="text-lg font-bold text-foreground">{formatNumber(clientesActuales)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground mb-1">Margen de Seguridad</p>
                      <p className="text-lg font-bold text-primary">{formatNumber(clientesExceso)} clientes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="space-y-4 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Ingresos vs Costes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={plData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="value" fill="#6D6DB3" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Flujo de Márgenes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={plDetalleData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="value" fill="#6D6DB3" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Break-Even vs Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={breakEvenChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => formatNumber(value as number)} />
                      <Bar dataKey="value" fill="#6D6DB3" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

