import { defineConfig } from "vite";

export default defineConfig({
  base: "/BETHAG/",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        resetPassword: "reset-password.html",
      },
    },
  },
});
