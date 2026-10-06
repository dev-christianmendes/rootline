"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./button";

interface PaginationProps {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of pages */
  pageCount: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Number of page links to show around current page */
  siblingCount?: number;
  /** Show first/last page buttons */
  showFirstLast?: boolean;
  /** Custom class name */
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const pages = React.useMemo(() => {
    const result: (number | "ellipsis")[] = [];

    if (pageCount <= 5 + 2 * siblingCount) {
      // Show all pages if total is small
      for (let i = 1; i <= pageCount; i++) {
        result.push(i);
      }
    } else {
      // Always show first page
      result.push(1);

      // Calculate start and end of middle range
      const leftSibling = Math.max(2, page - siblingCount);
      const rightSibling = Math.min(pageCount - 1, page + siblingCount);

      // Add left ellipsis if needed
      if (leftSibling > 2) {
        result.push("ellipsis");
      }

      // Add middle pages
      for (let i = leftSibling; i <= rightSibling; i++) {
        result.push(i);
      }

      // Add right ellipsis if needed
      if (rightSibling < pageCount - 1) {
        result.push("ellipsis");
      }

      // Always show last page
      result.push(pageCount);
    }

    return result;
  }, [page, pageCount, siblingCount]);

  return (
    <nav
      className={cn("flex items-center gap-1", className)}
      aria-label="Pagination"
    >
      {showFirstLast && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {pages.map((pageItem, index) =>
        pageItem === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="flex items-center px-2 text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Button
            key={pageItem}
            variant={page === pageItem ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(pageItem)}
            aria-label={`Page ${pageItem}`}
            aria-current={page === pageItem ? "page" : undefined}
          >
            {pageItem}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>

      {showFirstLast && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(pageCount)}
          disabled={page === pageCount}
          aria-label="Last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      )}
    </nav>
  );
}

interface PageSizeSelectorProps {
  /** Current page size */
  pageSize: number;
  /** Available page sizes */
  pageSizes?: number[];
  /** Callback when page size changes */
  onPageSizeChange: (size: number) => void;
  /** Custom class name */
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  pageSizes = [10, 25, 50, 100],
  onPageSizeChange,
  className,
}: PageSizeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor="page-size" className="text-xs text-muted-foreground">
        Rows per page:
      </label>
      <select
        id="page-size"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-8 w-auto rounded-md border border-border/70 bg-card px-2 py-1 text-sm font-mono focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow]"
      >
        {pageSizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  );
}
