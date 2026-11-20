import * as React from "react";
import { API_BASE } from "./api";

export function PwaRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
    const swUrl = `${import.meta.env.BASE_URL}sw.js?api=${encodeURIComponent(API_BASE)}`;
    navigator.serviceWorker.register(swUrl).catch(() => undefined);
  }, []);
  return null;
}
