import { useState, useCallback } from "react";
import type { CommandPage } from "@/types/command-palette";
import { logger } from "@/utils/logger";

export function useCommandPaletteState() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<CommandPage>("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const open = useCallback(() => {
    setIsOpen(true);
    setSearch("");
    setCurrentPage("home");
    setSelectedCategory(null);
    logger.info("user-interaction", "Command palette opened");
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setCurrentPage("home");
    setSelectedCategory(null);
    logger.info("user-interaction", "Command palette closed");
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const setPage = useCallback((page: CommandPage) => {
    setCurrentPage(page);
  }, []);

  const setCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setSearch(term);
  }, []);

  return {
    isOpen,
    currentPage,
    selectedCategory,
    search,
    open,
    close,
    toggle,
    setPage,
    setCategory,
    setSearch: setSearchTerm,
  };
}
