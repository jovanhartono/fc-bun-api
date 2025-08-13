import { goto } from "$app/navigation";

export const ssr = false;
export const prerender = false;

export function load({ url }) {
  const token = localStorage.getItem("jwt")
  console.log("triggered");

  if (!token && url.pathname.startsWith("/admin")) {
    console.log("navigate");
    // goto('/auth/login', {  replaceState: true});
  }
}