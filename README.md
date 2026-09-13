# Multi-Tier E-Commerce & POS Mobile Application

A cross-platform React Native & Expo mobile and web application adhering to the Software Requirements Specification (SRS).

## System Personalities & Roles

1. **Super Admin**: The platform overseer with global permissions across multiple independent shops and system users.
2. **Shop Admin**: The shop manager assigned to an independent business, responsible for generating unique alphanumeric product IDs, setting prices, restocking inventory, and recording shrinkage.
3. **POS Seller**: Retail floor operator who scans product IDs (via camera or manual lookup), enters unit quantities, and processes ACID-compliant checkouts with automatic inventory deduction.

---

## 🔑 Quick Demo Login Credentials

The login screen features 1-tap quick persona chips for rapid testing:

| Persona | Username | Password | Role | Assigned Shop |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin` | `SuperAdmin123!` | `super_admin` | Global Platform |
| **Shop 1 Admin** | `admin_tech` | `Admin123!` | `admin` | Downtown Tech & Gadgets (`SHP01`) |
| **Shop 2 Admin** | `admin_metro` | `Admin123!` | `admin` | Metro Fashion Boutique (`SHP02`) |
| **Shop 1 Seller** | `seller_alice` | `Seller123!` | `seller` | Downtown Tech & Gadgets (`SHP01`) |
| **Shop 2 Seller** | `seller_charlie` | `Seller123!` | `seller` | Metro Fashion Boutique (`SHP02`) |

---

## 🚀 Running the Project

### 1. Start the Backend API Server
In a terminal, navigate to the `backend/` directory:
```bash
cd backend
npm run db:init   # If you haven't initialized your MySQL database yet
npm run dev       # Starts REST API on http://localhost:5000
```

### 2. Start the React Native Frontend
In a separate terminal, navigate to `e-commerce-app/`:
```bash
cd e-commerce-app
npm run start     # Launches Expo interactive CLI
```
- Press `w` to open in your web browser.
- Press `a` to open in an Android emulator.
- Press `i` to open in an iOS simulator.
- Or scan the QR code with the **Expo Go** mobile app on your physical smartphone.

> [!TIP]
> **Testing on a Physical Smartphone:**
> On the login screen, tap the server URL at the bottom and enter your computer's local Wi-Fi IP (e.g. `http://192.168.1.50:5000/api`) so your phone can communicate with your computer's backend.
