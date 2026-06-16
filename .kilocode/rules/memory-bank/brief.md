# Project Brief: CTS Trading System

## Purpose

Crypto Trading System (CTS) with multi-exchange support for BingX, Binance, Bybit, OKX, Pionex, and OrangeX. Provides trade engine, indication processing, preset coordination, and real-time monitoring dashboards.

## Target Users

- Crypto traders managing multiple exchange accounts
- Algorithmic trading system operators
- Users needing real-time trading analytics

## Core Use Case

1. Connect to multiple exchanges (API keys/configure)
2. Set up trading presets and strategies
3. Run trade engine for automated indication processing
4. Monitor positions, orders, and performance in real-time

## Key Requirements

### Must Have

- Multi-exchange API connectors
- Trade engine with progression tracking
- Preset coordination system
- Real-time position monitoring
- Database persistence (SQLite/Redis)

### Features

- BingX, Binance, Bybit, OKX, Pionex, OrangeX connectors
- Preset coordination engine
- Trade engine with stages (indication, main, real, live)
- Real-time monitoring dashboards
- WebSocket data loading
