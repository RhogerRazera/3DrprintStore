import HomePage from "@/components/home-page";
import { demoProducts } from "@/lib/products";

export default function Page() {
  return <HomePage initialProducts={demoProducts} />;
}