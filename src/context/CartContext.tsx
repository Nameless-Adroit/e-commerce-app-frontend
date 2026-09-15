import React, { createContext, useContext, useState } from 'react';
import { Product, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemPrice: (productId: string, price: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalAmount: number;
  totalUnits: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, quantity = 1) => {
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = updated[existingIndex].quantity + quantity;
        // Don't exceed available stock
        const clampedQty = Math.min(newQty, product.stock_quantity);
        updated[existingIndex] = { ...updated[existingIndex], quantity: clampedQty };
        return updated;
      }
      return [...prevItems, { product, quantity: Math.min(quantity, product.stock_quantity) }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          const clamped = Math.min(quantity, item.product.stock_quantity);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  const updateItemPrice = (productId: string, price: number) => {
    const validPrice = Math.max(0, isNaN(price) ? 0 : price);
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          return { ...item, customPrice: validPrice };
        }
        return item;
      })
    );
  };

  const removeItem = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.customPrice !== undefined ? item.customPrice : item.product.price) * item.quantity,
    0
  );
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        updateItemPrice,
        removeItem,
        clearCart,
        totalAmount,
        totalUnits
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
