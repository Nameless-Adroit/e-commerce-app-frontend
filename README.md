# 🏪 JM Solution POS — Mobile & Web Application

A modern, high-speed, cross-platform **Point of Sale (POS), Inventory & Retail Management** client built with **React Native**, **Expo Router**, and **TypeScript**. Supports Android, iOS, and Modern Web browsers.

---

## 📖 1. System Overview

JM Solution POS provides an end-to-end retail management experience for single-store and multi-tenant retail businesses:
- **High-Velocity POS Floor Operations**: Instant barcode and unique product ID search, cart management, subtotal discounts, custom price overrides, and receipt generation with real-time stock deduction.
- **Unified Single Login**: No manual role picking or tab switching. Users input their credentials (**Phone Number & 6-Digit PIN** for all roles: Super Admin, Shop Admin, and POS Seller). The system automatically authorizes their role and opens their assigned dashboard.
- **Zero-Trust Security**: 15-minute access tokens held strictly in application volatile memory (RAM), paired with 7-day secure HTTP-only refresh cookies.
- **Adaptive Light & Dark Themes**: Crisp daylight mode and high-contrast midnight slate mode with automatic device synchronization.

---

## 🏗️ 2. Architecture & Role Portals

```
                             [Unified Sign In Screen]
                                        │
                         Credentials Analyzed by Backend
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
     [POS Seller]                  [Shop Admin]                [Super Admin]
      /seller                       /admin                      /super-admin
  ┌──────────────────┐          ┌──────────────────┐        ┌──────────────────┐
  │ • Fast POS Cart  │          │ • Restock Alert  │        │ • Tenant Config  │
  │ • Scanner Modal  │          │ • Price Editor   │        │ • Business Mgmt  │
  │ • Cash/M-Pesa Pay│          │ • Stock Ledger   │        │ • User Registry  │
  │ • Receipt Print  │          │ • Shop Analytics │        │ • Global Stats   │
  └──────────────────┘          └──────────────────┘        └──────────────────┘
```

### System Roles
1. **POS Seller (`/seller`)**: Frontline store cashier. Scans product barcodes or enters product IDs, manages cart items, applies item/order discounts, and processes checkout with immediate stock deduction.
2. **Shop Admin (`/admin`)**: Store manager. Restocks inventory, records shrinkage, modifies product pricing, and monitors shop-level revenue and top-selling products.
3. **Super Admin (`/super-admin`)**: Platform administrator. Creates independent business entities, assigns shop locations, and manages employee accounts.

---

## 🚀 3. Beginner's Localhost Quick-Start Guide

Follow these steps to run the application on your computer:

### Step 1: Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (version 18 or 20 LTS recommended).
- [Git](https://git-scm.com/).

---

### Step 2: Install Dependencies
Open your terminal in the `e-commerce-app` directory and install the packages:

```bash
cd e-commerce-app
npm install
```

---

### Step 3: Configure Environment (`.env`)
Create a `.env` file in the root of `e-commerce-app` (you can duplicate `.env.example`):

```ini
# Option A: Connect to local backend running on your machine (Default)
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Option B: Connect to live production cloud backend
# EXPO_PUBLIC_API_URL=https://api-pos-ecommerce.jmsolutions.co.tz/api
# EXPO_PUBLIC_API_BASE_URL=https://api-pos-ecommerce.jmsolutions.co.tz/api
```

> [!NOTE]
> If testing on a physical phone via Wi-Fi, replace `localhost` with your computer's local Wi-Fi IPv4 address (e.g. `http://192.168.1.50:3000/api`).

---

### Step 4: Launch the Application
Start the Expo development server:

```bash
npx expo start
```

Once the terminal menu appears:
- Press **`w`** on your keyboard $\rightarrow$ Opens the web version immediately in your browser (`http://localhost:8081`).
- Press **`a`** $\rightarrow$ Opens in an active Android Emulator.
- **Physical Phone**: Install **Expo Go** from the Google Play Store or Apple App Store, and scan the QR code displayed in your terminal.

---

## 🔑 4. Chosen Seed Credentials for Testing

Authentication strictly requires a **Phone Number** and a **6-Digit PIN** for all users:

| Role | User / Full Name | Phone Number (Local) | Phone Number (E.164) | 6-Digit PIN | Assigned Store / Scope | Portal |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Alexander Cross (`superadmin`) | `0700 000 001` | `+255700000001` | `123456` | Platform Overseer | `/super-admin` |
| **Shop Admin 1** | Marcus Vance (`admin_tech`) | `0712 100 001` | `+255712100001` | `123456` | Kariakoo Tech Hub | `/admin` |
| **Shop Admin 2** | Elena Rostova (`admin_metro`) | `0712 100 002` | `+255712100002` | `123456` | Mlimani Boutique | `/admin` |
| **POS Seller 1** | Alice Morgan (`seller_alice`) | `0712 200 001` | `+255712200001` | `123456` | Kariakoo Tech Hub | `/seller` |
| **POS Seller 2** | Bob Kendrick (`seller_bob`) | `0712 200 002` | `+255712200002` | `123456` | Kariakoo Tech Hub | `/seller` |
| **POS Seller 3** | Charlie Dupont (`seller_charlie`) | `0712 200 003` | `+255712200003` | `123456` | Mlimani Boutique | `/seller` |

---

## 📂 5. Project Folder Structure

```
e-commerce-app/
├── assets/             # Logos, app icons, and splash screen images
├── src/
│   ├── app/            # Expo Router file-based screen navigation
│   │   ├── index.tsx   # Unified single login screen (Phone + 6-digit PIN)
│   │   ├── seller/     # POS checkout, cart, and sales history screens
│   │   ├── admin/      # Product inventory, restocking, and reports
│   │   └── super-admin/# Multi-tenant business and user management
│   ├── components/     # Reusable UI widgets (Header, Modals, ProductCard)
│   ├── config/         # API base URL discovery and local overrides
│   ├── context/        # React Context providers (AuthContext, CartContext, ThemeContext)
│   ├── services/       # Centralized API client & 401 refresh mutex queue (api.ts)
│   ├── theme/          # Tailored light & dark theme color tokens
│   ├── types/          # TypeScript interfaces (User, Product, Transaction, Session)
│   └── utils/          # Phone normalization (E.164), operator detection, ID generator
├── app.json            # Expo app configuration (version, package name, permissions)
├── eas.json            # Expo Application Services (EAS) cloud build & OTA profiles
└── package.json        # Dependencies and build scripts
```
