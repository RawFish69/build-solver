import { useEffect } from "react";
import { ControlRoomHeroSection } from "@/components/ui/hero-control-room-card";

export default function DemoTwo() {
  useEffect(() => {
    document.documentElement.dataset.wbTheme = "dark";
  }, []);

  return <ControlRoomHeroSection />;
}
