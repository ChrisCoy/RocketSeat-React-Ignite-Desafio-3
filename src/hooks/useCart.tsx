import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const alreadyOnCart = cart.find((product) => product.id === productId);

      if (alreadyOnCart) {
        const stock: Stock = (await api.get("stock/" + productId)).data;

        if (alreadyOnCart.amount < stock.amount) {
          const tempProducts = cart.map((product) => {
            return product.id === productId
              ? { ...product, amount: product.amount + 1 }
              : product;
          });
          setCart(tempProducts);
        } else toast.error("Quantidade solicitada fora de estoque");
      } else {
        const product: Product = (await api.get("products/" + productId)).data;
        setCart([...cart, { ...product, amount: 1 }]);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      setCart(cart.filter((product) => product.id !== productId));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 1) return;

      const stock: Stock = (await api.get("stock/" + productId)).data;
      setCart(
        cart.map((product) => {
          if (product.id === productId) {
            if (!(product.amount < stock.amount) && product.amount < amount) {
              toast.error("Quantidade solicitada fora de estoque");
              return product;
            }
            return { ...product, amount: amount };
          }
          return product;
        })
      );
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
