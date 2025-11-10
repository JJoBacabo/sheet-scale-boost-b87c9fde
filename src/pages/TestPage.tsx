import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card3D } from "@/components/ui/Card3D";
import { Button3D } from "@/components/ui/Button3D";
import { Background3D } from "@/components/ui/Background3D";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@/assets/logo.png";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Eye,
  Filter,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";

// Dados simulados para demonstração
interface ProductData {
  id: string;
  name: string;
  category: string;
  price: number;
  sales: number;
  revenue: number;
  views: number;
  status: "active" | "paused" | "draft";
  trend: "up" | "down" | "stable";
  change: number;
}

interface StatCard {
  label: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const TestPage = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dados simulados
  const productsData: ProductData[] = useMemo(() => [
    {
      id: "1",
      name: "Smart Watch Pro",
      category: "Electronics",
      price: 299.99,
      sales: 1247,
      revenue: 374253.53,
      views: 15234,
      status: "active",
      trend: "up",
      change: 12.5
    },
    {
      id: "2",
      name: "Wireless Headphones",
      category: "Audio",
      price: 89.99,
      sales: 892,
      revenue: 80270.08,
      views: 11245,
      status: "active",
      trend: "up",
      change: 8.3
    },
    {
      id: "3",
      name: "Laptop Stand",
      category: "Accessories",
      price: 49.99,
      sales: 634,
      revenue: 31696.66,
      views: 8456,
      status: "paused",
      trend: "down",
      change: -5.2
    },
    {
      id: "4",
      name: "USB-C Hub",
      category: "Accessories",
      price: 79.99,
      sales: 1023,
      revenue: 81829.77,
      views: 9876,
      status: "active",
      trend: "up",
      change: 15.7
    },
    {
      id: "5",
      name: "Mechanical Keyboard",
      category: "Electronics",
      price: 149.99,
      sales: 456,
      revenue: 68399.44,
      views: 6543,
      status: "active",
      trend: "stable",
      change: 0.3
    },
    {
      id: "6",
      name: "Monitor Stand",
      category: "Accessories",
      price: 39.99,
      sales: 789,
      revenue: 31551.11,
      views: 7234,
      status: "draft",
      trend: "down",
      change: -2.1
    },
    {
      id: "7",
      name: "Webcam HD",
      category: "Electronics",
      price: 129.99,
      sales: 567,
      revenue: 73707.33,
      views: 9123,
      status: "active",
      trend: "up",
      change: 9.8
    },
    {
      id: "8",
      name: "Mouse Pad",
      category: "Accessories",
      price: 19.99,
      sales: 1234,
      revenue: 24676.66,
      views: 5678,
      status: "active",
      trend: "up",
      change: 4.2
    }
  ], []);

  // Calcular estatísticas
  const stats: StatCard[] = useMemo(() => {
    const totalRevenue = productsData.reduce((sum, p) => sum + p.revenue, 0);
    const totalSales = productsData.reduce((sum, p) => sum + p.sales, 0);
    const totalViews = productsData.reduce((sum, p) => sum + p.views, 0);
    const activeProducts = productsData.filter(p => p.status === "active").length;

    const revenueChange = 18.5;
    const salesChange = 12.3;
    const viewsChange = 8.7;
    const productsChange = 5.2;

    return [
      {
        label: "Total Revenue",
        value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalRevenue),
        change: revenueChange,
        icon: DollarSign,
        color: "text-emerald-500"
      },
      {
        label: "Total Sales",
        value: totalSales.toLocaleString(),
        change: salesChange,
        icon: ShoppingCart,
        color: "text-blue-500"
      },
      {
        label: "Total Views",
        value: totalViews.toLocaleString(),
        change: viewsChange,
        icon: Eye,
        color: "text-purple-500"
      },
      {
        label: "Active Products",
        value: activeProducts,
        change: productsChange,
        icon: Activity,
        color: "text-primary"
      }
    ];
  }, [productsData]);

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    return productsData.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || product.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, filterStatus, productsData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      active: { variant: "default", label: "Active" },
      paused: { variant: "secondary", label: "Paused" },
      draft: { variant: "outline", label: "Draft" }
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background 3D */}
      <Background3D />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3"
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-30 animate-pulse" />
                <motion.img 
                  src={logo} 
                  alt="Sheet Tools" 
                  className="h-12 sm:h-16 w-auto relative logo-glow"
                  animate={{ 
                    filter: [
                      "drop-shadow(0 0 8px rgba(74, 233, 189, 0.3))",
                      "drop-shadow(0 0 16px rgba(74, 233, 189, 0.5))",
                      "drop-shadow(0 0 8px rgba(74, 233, 189, 0.3))"
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </div>
            </motion.div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button3D variant="glass" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button3D>
              <Button3D variant="glass" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button3D>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
              Test Page - Data Dashboard
            </h1>
            <p className="text-xl text-muted-foreground">
              Demonstração de design moderno com dados funcionais
            </p>
          </motion.div>
      {/* Stats Cards */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isPositive = stat.change > 0;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card3D intensity="medium" glow className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-primary/20 flex items-center justify-center ${stat.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <motion.div
                      className={`flex items-center gap-1 text-sm font-semibold ${
                        isPositive ? "text-emerald-500" : "text-red-500"
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      {isPositive ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                      {Math.abs(stat.change)}%
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1 gradient-text">{stat.value}</h3>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </Card3D>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Filters and Search */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card3D intensity="low" className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button3D
                variant={filterStatus === "all" ? "gradient" : "glass"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All
              </Button3D>
              <Button3D
                variant={filterStatus === "active" ? "gradient" : "glass"}
                size="sm"
                onClick={() => setFilterStatus("active")}
              >
                Active
              </Button3D>
              <Button3D
                variant={filterStatus === "paused" ? "gradient" : "glass"}
                size="sm"
                onClick={() => setFilterStatus("paused")}
              >
                Paused
              </Button3D>
              <Button3D
                variant={filterStatus === "draft" ? "gradient" : "glass"}
                size="sm"
                onClick={() => setFilterStatus("draft")}
              >
                Draft
              </Button3D>
            </div>
          </div>
        </Card3D>
      </motion.section>

      {/* Data Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card3D intensity="medium" glow className="p-6 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold gradient-text">Products Overview</h2>
            <div className="flex gap-2">
              <Button3D variant="glass" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Charts
              </Button3D>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold text-right">Price</TableHead>
                  <TableHead className="font-semibold text-right">Sales</TableHead>
                  <TableHead className="font-semibold text-right">Revenue</TableHead>
                  <TableHead className="font-semibold text-right">Views</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, index) => {
                    const TrendIcon = product.trend === "up" ? TrendingUp : 
                                     product.trend === "down" ? TrendingDown : Activity;
                    const trendColor = product.trend === "up" ? "text-emerald-500" : 
                                      product.trend === "down" ? "text-red-500" : "text-muted-foreground";
                    
                    return (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-muted-foreground">{product.category}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right">{product.sales.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {product.views.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(product.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                            <span className={`text-sm font-medium ${trendColor}`}>
                              {product.change > 0 ? "+" : ""}{product.change}%
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 pt-6 border-t border-border/30 flex flex-wrap gap-6 justify-between items-center"
          >
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredProducts.length}</span> of{" "}
              <span className="font-semibold text-foreground">{productsData.length}</span> products
            </div>
            <div className="flex gap-2">
              <Button3D variant="glass" size="sm" disabled>
                Previous
              </Button3D>
              <Button3D variant="gradient" size="sm">
                1
              </Button3D>
              <Button3D variant="glass" size="sm">
                2
              </Button3D>
              <Button3D variant="glass" size="sm">
                Next
              </Button3D>
            </div>
          </motion.div>
        </Card3D>
      </motion.section>

      {/* Charts Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card3D intensity="medium" glow className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Sales Performance</h3>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {[65, 80, 45, 90, 70, 85, 95, 75, 88, 92, 70, 85].map((height, index) => (
              <motion.div
                key={index}
                className="flex-1 bg-gradient-primary rounded-t-lg relative group"
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.5 + index * 0.05, duration: 0.5 }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold bg-background px-2 py-1 rounded shadow-lg">
                  {height}%
                </div>
              </motion.div>
            ))}
          </div>
        </Card3D>

        <Card3D intensity="medium" glow className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Category Distribution</h3>
              <p className="text-sm text-muted-foreground">By revenue</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: "Electronics", value: 45, color: "bg-primary" },
              { label: "Audio", value: 25, color: "bg-blue-500" },
              { label: "Accessories", value: 30, color: "bg-purple-500" }
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm font-bold">{item.value}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${item.color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.8 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </Card3D>
      </motion.section>
        </div>
      </main>
    </div>
  );
};

export default TestPage;
