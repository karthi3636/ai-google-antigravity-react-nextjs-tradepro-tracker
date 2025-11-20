'use client';

import { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- Mock Data & Constants ---
const INITIAL_STOCKS = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2355.80, change: 12.40, changePercent: 0.53, currency: '₹' },
    { symbol: 'TCS', name: 'Tata Consultancy Svcs', price: 3480.20, change: -15.60, changePercent: -0.45, currency: '₹' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: 1510.50, change: 8.30, changePercent: 0.55, currency: '₹' },
    { symbol: 'INFY', name: 'Infosys Ltd', price: 1420.75, change: 5.25, changePercent: 0.37, currency: '₹' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', price: 625.40, change: -2.10, changePercent: -0.33, currency: '₹' },
    { symbol: 'SBIN', name: 'State Bank of India', price: 575.15, change: 3.45, changePercent: 0.60, currency: '₹' },
];

const INITIAL_FOREX = [
    { symbol: 'XAU/USD', name: 'Gold Spot / US Dollar', price: 1985.40, change: 12.50, changePercent: 0.63, currency: '$' },
    { symbol: 'XAG/USD', name: 'Silver Spot / US Dollar', price: 23.65, change: 0.15, changePercent: 0.64, currency: '$' },
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: 1.0925, change: 0.0015, changePercent: 0.14, currency: '$' },
    { symbol: 'GBP/USD', name: 'British Pound / US Dollar', price: 1.2640, change: -0.0020, changePercent: -0.16, currency: '$' },
    { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', price: 148.50, change: 0.45, changePercent: 0.30, currency: '¥' },
];

const CRYPTO_MAP = {
    'BTCUSDT': { symbol: 'BTC', name: 'Bitcoin' },
    'ETHUSDT': { symbol: 'ETH', name: 'Ethereum' },
    'SOLUSDT': { symbol: 'SOL', name: 'Solana' },
    'XRPUSDT': { symbol: 'XRP', name: 'Ripple' },
    'ADAUSDT': { symbol: 'ADA', name: 'Cardano' },
    'BNBUSDT': { symbol: 'BNB', name: 'Binance Coin' }
};

export default function Home() {
    const [currentView, setCurrentView] = useState('dashboard');
    const [currentCategory, setCurrentCategory] = useState('crypto');
    const [stocksData, setStocksData] = useState(INITIAL_STOCKS);
    const [forexData, setForexData] = useState(INITIAL_FOREX);
    const [cryptoData, setCryptoData] = useState([]);
    const [currentDate, setCurrentDate] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const [location, setLocation] = useState('Detecting...');
    const [chartPeriod, setChartPeriod] = useState('1D');
    const [cryptoChartData, setCryptoChartData] = useState(null);

    // --- Effects ---
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            setCurrentDate(now.toLocaleDateString('en-US', options));
            setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        // Detect Location from Timezone
        try {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const city = timeZone.split('/')[1]?.replace(/_/g, ' ') || 'Unknown';
            setLocation(city);
        } catch (e) {
            setLocation('Unknown Location');
        }

        return () => clearInterval(interval);
    }, []);

    // Live Data Simulation for Stocks & Forex
    useEffect(() => {
        const simulateLiveMarket = () => {
            setStocksData(prev => prev.map(stock => {
                const change = (Math.random() - 0.5) * 2; // Random fluctuation
                const newPrice = stock.price + change;
                return {
                    ...stock,
                    price: newPrice,
                    change: stock.change + change,
                    changePercent: ((stock.change + change) / (stock.price - stock.change)) * 100
                };
            }));

            setForexData(prev => prev.map(item => {
                const volatility = item.symbol.includes('XAU') ? 0.5 : 0.0005;
                const change = (Math.random() - 0.5) * volatility * 2;
                const newPrice = item.price + change;
                return {
                    ...item,
                    price: newPrice,
                    change: item.change + change,
                    changePercent: ((item.change + change) / (item.price - item.change)) * 100
                };
            }));
        };

        const interval = setInterval(simulateLiveMarket, 3000); // Update every 3 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (currentCategory === 'crypto') {
            fetchCryptoData();
            const interval = setInterval(fetchCryptoData, 10000);
            return () => clearInterval(interval);
        }
    }, [currentCategory]);

    useEffect(() => {
        if (currentCategory === 'crypto') {
            fetchCryptoChartData();
        }
    }, [currentCategory, chartPeriod]);

    // --- Data Fetching ---
    const fetchCryptoData = async () => {
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            const data = await response.json();
            const relevantData = data.filter(item => CRYPTO_MAP[item.symbol]);

            const formattedData = relevantData.map(item => {
                const info = CRYPTO_MAP[item.symbol];
                return {
                    symbol: info.symbol,
                    name: info.name,
                    price: parseFloat(item.lastPrice),
                    change: parseFloat(item.priceChange),
                    changePercent: parseFloat(item.priceChangePercent),
                    currency: '$'
                };
            });
            setCryptoData(formattedData);
        } catch (error) {
            console.error('Error fetching crypto data:', error);
        }
    };

    const fetchCryptoChartData = async () => {
        try {
            const periodConfig = {
                '1D': { interval: '15m', limit: 96 },
                '1W': { interval: '1h', limit: 168 },
                '1M': { interval: '4h', limit: 180 },
                '1Y': { interval: '1d', limit: 365 }
            };

            const config = periodConfig[chartPeriod];
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${config.interval}&limit=${config.limit}`
            );
            const data = await response.json();

            const labels = data.map(candle => {
                const date = new Date(candle[0]);
                if (chartPeriod === '1D') {
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                } else if (chartPeriod === '1W') {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' });
                } else if (chartPeriod === '1M') {
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else {
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }
            });

            const prices = data.map(candle => parseFloat(candle[4]));

            setCryptoChartData({ labels, prices });
        } catch (error) {
            console.error('Error fetching crypto chart data:', error);
        }
    };

    // --- Helpers ---
    const getData = () => {
        if (currentCategory === 'stocks') return stocksData;
        if (currentCategory === 'forex') return forexData;
        if (currentCategory === 'crypto') return cryptoData;
        return [];
    };

    const formatPrice = (price, currency = '$') => {
        const val = parseFloat(price);
        if (currentCategory === 'forex' && !currency.includes('¥')) return `${currency}${val.toFixed(4)}`;
        if (currentCategory === 'crypto' && val < 1) return `${currency}${val.toFixed(4)}`;
        return `${currency}${val.toFixed(2)}`;
    };

    // --- Render Components ---
    const renderMarketSummary = () => {
        const data = getData();
        return data.slice(0, 4).map((item, index) => {
            const status = item.change >= 0 ? 'up' : 'down';
            const icon = item.change >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';

            return (
                <div key={index} className={`card summary-card ${status}`}>
                    <div className="card-header">
                        <span>{item.symbol}</span>
                        <i className={`fa-solid ${icon}`}></i>
                    </div>
                    <div className="card-value">{formatPrice(item.price, item.currency)}</div>
                    <div className="card-change">
                        {item.change > 0 ? '+' : ''}{formatPrice(item.change, item.currency)} ({item.changePercent.toFixed(2)}%)
                    </div>
                </div>
            );
        });
    };

    const renderTopMovers = () => {
        const data = [...getData()].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
        return data.slice(0, 5).map((item, index) => (
            <li key={index} className="stock-item">
                <div className="stock-info">
                    <div className="stock-icon">{item.symbol.substring(0, 2)}</div>
                    <div className="stock-details">
                        <span className="stock-symbol">{item.symbol}</span>
                        <span className="stock-name">{item.name}</span>
                    </div>
                </div>
                <div className="stock-price-info">
                    <div className="stock-price">{formatPrice(item.price, item.currency)}</div>
                    <div className={`stock-change ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {item.change > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                    </div>
                </div>
            </li>
        ));
    };

    // --- Chart Configuration ---
    const getChartData = () => {
        let data, labels, chartLabel;

        if (currentCategory === 'crypto' && cryptoChartData) {
            data = cryptoChartData.prices;
            labels = cryptoChartData.labels;
            chartLabel = 'BTC Price (USD)';
        } else {
            // Simulated chart data for Stocks and Forex
            chartLabel = currentCategory === 'stocks' ? 'NIFTY 50 Performance (INR)' : 'Gold Spot Price (USD)';

            // Base values for simulation
            const baseValue = currentCategory === 'stocks' ? 19500 : 1980;

            if (chartPeriod === '1D') {
                labels = ['9:30', '10:30', '11:30', '12:30', '1:30', '2:30', '3:30'];
                data = labels.map(() => baseValue + (Math.random() - 0.5) * (baseValue * 0.01));
            } else if (chartPeriod === '1W') {
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                data = labels.map(() => baseValue + (Math.random() - 0.5) * (baseValue * 0.02));
            } else if (chartPeriod === '1M') {
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                data = labels.map(() => baseValue + (Math.random() - 0.5) * (baseValue * 0.05));
            } else if (chartPeriod === '1Y') {
                labels = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov', 'Dec'];
                data = labels.map(() => baseValue + (Math.random() - 0.5) * (baseValue * 0.1));
            }
        }

        return {
            labels: labels,
            datasets: [{
                label: chartLabel,
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };
    };

    const mainChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        }
    };

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="logo">
                    <i className="fa-solid fa-layer-group"></i>
                    <span>TradePro</span>
                </div>
                <nav>
                    <a href="#" className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
                        <i className="fa-solid fa-chart-line"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="#" className={`nav-item ${currentView === 'analysis' ? 'active' : ''}`} onClick={() => setCurrentView('analysis')}>
                        <i className="fa-solid fa-magnifying-glass-chart"></i>
                        <span>Analysis</span>
                    </a>
                    <a href="#" className="nav-item">
                        <i className="fa-solid fa-gear"></i>
                        <span>Settings</span>
                    </a>
                </nav>
                <div className="user-profile">
                    <div className="avatar">K</div>
                    <div className="info">
                        <span className="name">Karthik</span>
                        <span className="role">Pro Trader</span>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="top-bar">
                    <div className="search-bar">
                        <i className="fa-solid fa-search"></i>
                        <input type="text" placeholder="Search stocks, ETFs, news..." />
                    </div>

                    <div className="actions">
                        <button className="icon-btn"><i className="fa-regular fa-bell"></i></button>
                        <button className="theme-toggle"><i className="fa-solid fa-moon"></i></button>
                    </div>
                </header>

                {currentView === 'dashboard' && (
                    <div className="view active">
                        <div className="view-header">
                            <div>
                                <h1>Market Overview</h1>
                                <div className="date-display">{currentDate} • {location} • {currentTime}</div>
                            </div>

                        </div>

                        <div className="market-summary">
                            {renderMarketSummary()}
                        </div>

                        <div className="content-grid">
                            <div className="card main-chart-card">
                                <div className="card-header-row">
                                    <h2>Market Performance</h2>
                                    <div className="chart-controls">
                                        {['1D', '1W', '1M', '1Y'].map(period => (
                                            <button
                                                key={period}
                                                className={`chart-period ${chartPeriod === period ? 'active' : ''}`}
                                                onClick={() => setChartPeriod(period)}
                                            >
                                                {period}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="chart-container">
                                    <Line data={getChartData()} options={mainChartOptions} />
                                </div>
                            </div>

                            <div className="card top-movers-card">
                                <div className="card-header-row">
                                    <h2>Top Movers</h2>
                                    <button className="view-all">View All</button>
                                </div>
                                <ul className="stock-list">
                                    {renderTopMovers()}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'analysis' && (
                    <div className="view active">
                        <div className="view-header">
                            <h1>Analysis</h1>
                            <div className="export-controls flex gap-2">
                                <button
                                    className="btn btn-outline"
                                    onClick={() => window.location.href = `mailto:?subject=TradePro Market Analysis&body=Check out the latest market analysis from TradePro!`}
                                >
                                    <i className="fa-solid fa-envelope"></i> Email
                                </button>
                                <button className="btn btn-outline">
                                    <i className="fa-solid fa-file-excel"></i> Export Excel
                                </button>
                                <button className="btn btn-primary">
                                    <i className="fa-solid fa-file-pdf"></i> Export PDF
                                </button>
                            </div>
                        </div>

                        <div className="analysis-grid">
                            <div className="card stock-selector-card">
                                <div className="search-wrapper">

                                    <input type="text" id="stock-search" placeholder="Search symbol..." />
                                </div>
                            </div>

                            <div className="card analysis-chart-card">
                                <div className="card-header-row mb-4">
                                    <h2>Price Analysis</h2>
                                    <div className="chart-controls">
                                        {['1D', '1W', '1M', '1Y'].map(period => (
                                            <button
                                                key={period}
                                                className={`chart-period ${chartPeriod === period ? 'active' : ''}`}
                                                onClick={() => setChartPeriod(period)}
                                            >
                                                {period}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="chart-container" style={{ height: '300px' }}>
                                    <Line data={getChartData()} options={mainChartOptions} />
                                </div>
                            </div>

                            <div className="card stats-card mt-4">
                                <h2>Key Statistics</h2>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="stat-item">
                                        <span className="text-gray-400 text-sm">Open</span>
                                        <div className="font-bold">2,345.00</div>
                                    </div>
                                    <div className="stat-item">
                                        <span className="text-gray-400 text-sm">High</span>
                                        <div className="font-bold">2,380.50</div>
                                    </div>
                                    <div className="stat-item">
                                        <span className="text-gray-400 text-sm">Low</span>
                                        <div className="font-bold">2,320.10</div>
                                    </div>
                                    <div className="stat-item">
                                        <span className="text-gray-400 text-sm">Vol</span>
                                        <div className="font-bold">1.2M</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
