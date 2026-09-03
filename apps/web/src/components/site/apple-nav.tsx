"use client";
/**
 * DAEMUN III navbar — adapted from skiper-ui skiper38 (Apple Navbar V001).
 * Same hover mega-menu / mobile stagger pattern, DAEMUN navigation data.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Menu, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

import { AuthMenu } from "@/components/site/auth-menu";
import { cn } from "@/lib/utils";

type MenuLink = { label: string; href: string };
type MenuColumn = { title: string; items: MenuLink[] };
type MenuContent = { firstUl: MenuColumn; secondUl: MenuColumn };

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "About", href: "/about" },
  { label: "Secretariat", href: "/secretariat" },
  { label: "Committees", href: "/committees" },
  { label: "Resolutions", href: "/resolutions" },
  { label: "Guide to MUN", href: "/guide" },
  { label: "Announcements", href: "/announcements" },
  { label: "Contact", href: "/#contact" },
];

const MENU_CONTENT: Record<string, MenuContent> = {
  About: {
    firstUl: {
      title: "DAEMUN",
      items: [
        { label: "About DAEMUN", href: "/about" },
        { label: "Past MUN Videos", href: "/about#videos" },
      ],
    },
    secondUl: {
      title: "This year",
      items: [
        { label: "Theme", href: "/#theme" },
        { label: "Schedule", href: "/#schedule" },
      ],
    },
  },
  Secretariat: {
    firstUl: {
      title: "Leadership",
      items: [
        { label: "Director", href: "/secretariat" },
        { label: "Secretary-General", href: "/secretariat" },
        { label: "Executive Departments", href: "/secretariat" },
        { label: "Committee Chairs", href: "/secretariat" },
      ],
    },
    secondUl: {
      title: "Departments",
      items: [
        { label: "Technology", href: "/secretariat" },
        { label: "Media", href: "/secretariat" },
        { label: "Administration", href: "/secretariat" },
      ],
    },
  },
  Committees: {
    firstUl: {
      title: "Councils",
      items: [
        { label: "ECOSOC", href: "/committees" },
        { label: "UNOOSA", href: "/committees" },
      ],
    },
    secondUl: {
      title: "Preparation",
      items: [
        { label: "Topics", href: "/committees" },
        { label: "Chair Reports", href: "/committees" },
      ],
    },
  },
  Resolutions: {
    firstUl: {
      title: "During the conference",
      items: [
        { label: "Approval Panel", href: "/resolutions" },
        { label: "ECOSOC Drafts", href: "/resolutions" },
        { label: "UNOOSA Drafts", href: "/resolutions" },
      ],
    },
    secondUl: {
      title: "Write your own",
      items: [
        { label: "Resolution Template", href: "/guide#downloads" },
        { label: "Worked Examples", href: "/guide#downloads" },
      ],
    },
  },
  "Guide to MUN": {
    firstUl: {
      title: "First-time delegates",
      items: [
        { label: "The Committees", href: "/guide#committees" },
        { label: "Rules of Procedure", href: "/guide#rop" },
        { label: "Writing a Resolution", href: "/guide#clauses" },
        { label: "Documents", href: "/guide#downloads" },
      ],
    },
    secondUl: {
      title: "Downloads",
      items: [
        { label: "Clauses Vocabulary", href: "/guide#downloads" },
        { label: "ROP for Delegates", href: "/guide#downloads" },
        { label: "Speech Template", href: "/guide#downloads" },
      ],
    },
  },
};

const menuItemVariants = {
  hidden: { opacity: 0, y: "-20%" },
  visible: { opacity: 1, y: 0 },
};

const menuContainerVariants = {
  visible: { transition: { staggerChildren: 0.06 } },
};

const MenuSection = ({
  title,
  items,
  isLarge = false,
  onNavigate,
}: {
  title: string;
  items: MenuLink[];
  isLarge?: boolean;
  onNavigate: () => void;
}) => (
  <motion.ul
    className="space-y-2"
    initial="hidden"
    animate="visible"
    exit="hidden"
    variants={menuContainerVariants}
  >
    <motion.li
      variants={menuItemVariants}
      transition={{ duration: 0.3 }}
      className="font-roman my-4 text-[13px] uppercase tracking-widest opacity-50"
    >
      {title}
    </motion.li>
    {items.map((item) => (
      <motion.li
        key={item.label}
        variants={menuItemVariants}
        transition={{ duration: 0.3 }}
        className={cn(
          "cursor-pointer tracking-tight",
          isLarge
            ? "group relative flex items-center text-[25px] font-[600]"
            : "text-[15px] font-[500]",
        )}
      >
        <Link href={item.href} onClick={onNavigate} className="flex items-center">
          {item.label}
          {isLarge && (
            <ChevronRight className="absolute -right-10 size-6 opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100" />
          )}
        </Link>
      </motion.li>
    ))}
  </motion.ul>
);

const MobileMenu = ({ onNavigate }: { onNavigate: () => void }) => (
  <div className="h-screen w-full bg-white pt-6 backdrop-blur-2xl">
    <div className="mb-6 px-8">
      <AuthMenu onNavigate={onNavigate} />
    </div>
    <motion.ul
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{
        visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
      }}
      className="flex flex-col gap-5 text-3xl font-[600] tracking-tight"
    >
      {[{ label: "Home", href: "/" }, ...NAV_ITEMS].map((item) => (
        <motion.li
          key={item.label}
          variants={{
            hidden: { opacity: 0, y: "-10%" },
            visible: { opacity: 1, y: 0 },
          }}
          className="group relative flex cursor-pointer items-center justify-between px-8"
        >
          <Link
            href={item.href}
            onClick={onNavigate}
            className="flex w-full items-center justify-between"
          >
            {item.label}
            <ChevronRight className="size-6 opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100" />
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  </div>
);

export function AppleNav() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentContent = hoveredItem ? MENU_CONTENT[hoveredItem] : null;
  const showMenu = Boolean(currentContent) || isMenuOpen;
  const closeAll = () => {
    setHoveredItem(null);
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 z-50 flex w-full flex-col items-center justify-center">
      {/* Header bar */}
      <div className="relative z-20 flex w-full items-center justify-center border-b border-black/10 bg-white shadow-[0_6px_20px_rgba(10,20,40,0.07)]">
        <ul className="flex w-full max-w-[1024px] items-center justify-between gap-5 bg-white px-5 text-[13px] lg:px-0">
          <motion.li
            animate={{ opacity: isMenuOpen ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              href="/"
              onClick={closeAll}
              className="flex items-center gap-2 py-2"
              onMouseEnter={() => setHoveredItem(null)}
            >
              <Image
                src="/emblem-navy.png"
                alt="DAEMUN emblem"
                width={30}
                height={23}
              />
              <span className="font-roman text-[15px] tracking-[0.18em]">
                DAEMUN III
              </span>
            </Link>
          </motion.li>

          {/* Desktop items */}
          {NAV_ITEMS.map((item) => (
            <li
              key={item.label}
              className="hidden cursor-pointer py-4 lg:block"
              onMouseEnter={() => setHoveredItem(MENU_CONTENT[item.label] ? item.label : null)}
            >
              <Link href={item.href} onClick={closeAll}>
                {item.label}
              </Link>
            </li>
          ))}

          {/* Sign in / account (desktop) */}
          <li
            className="hidden items-center py-2 lg:flex"
            onMouseEnter={() => setHoveredItem(null)}
          >
            <AuthMenu onNavigate={closeAll} />
          </li>

          {/* Mobile toggle */}
          <li className="flex items-center justify-center py-2 lg:hidden">
            <span className="cursor-pointer" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {!isMenuOpen ? (
                <Menu className="size-6 stroke-[1]" />
              ) : (
                <Plus className="size-6 -rotate-45 stroke-[1]" />
              )}
            </span>
          </li>
        </ul>
      </div>


      {/* Dropdown */}
      <motion.div
        initial={{ height: "0px" }}
        animate={{ height: showMenu ? "auto" : "0" }}
        transition={{ ease: [0.645, 0.045, 0.355, 1], duration: 0.5 }}
        onMouseLeave={() => setHoveredItem(null)}
        className="relative z-20 flex w-full justify-center overflow-hidden bg-white"
      >
        <AnimatePresence>
          {currentContent && (
            <motion.div
              exit={{ opacity: 0, transition: { duration: 0.4, delay: 0.5 } }}
              className="flex w-full max-w-[1024px] gap-32 px-5 pb-20 pt-10 lg:px-0"
            >
              <MenuSection
                title={currentContent.firstUl.title}
                items={currentContent.firstUl.items}
                isLarge
                onNavigate={closeAll}
              />
              <MenuSection
                title={currentContent.secondUl.title}
                items={currentContent.secondUl.items}
                onNavigate={closeAll}
              />
            </motion.div>
          )}

          {isMenuOpen && <MobileMenu onNavigate={closeAll} />}
        </AnimatePresence>
      </motion.div>

      {/* Background blur while a menu is open */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: hoveredItem ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="pointer-events-none absolute left-0 top-0 z-10 h-screen w-full bg-white/20 blur-lg backdrop-blur-xl"
      />
    </nav>
  );
}
