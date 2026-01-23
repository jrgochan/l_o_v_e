/**
 * Browser interaction helpers to facilitate testing.
 */
export const reloadPage = () => {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
};
