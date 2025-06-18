
import { AppProvider } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";

export default function HomePage() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
