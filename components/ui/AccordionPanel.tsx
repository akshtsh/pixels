'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionPanelProps {
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export default function AccordionPanel({
    title,
    icon,
    defaultOpen = false,
    children,
}: AccordionPanelProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className="mb-4 border-2 border-editor-border bg-editor-surface shadow-retro overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex w-full items-center justify-between px-3 py-2',
                    'text-sm font-bold uppercase tracking-wide text-editor-text',
                    'bg-editor-surface border-b-2 border-editor-border',
                    'hover:bg-yellow-100 transition-colors duration-150'
                )}
            >
                <div className="flex items-center gap-2">
                    <span className="text-editor-text border border-editor-border p-0.5 bg-white shadow-[1px_1px_0_0_#000]">{icon}</span>
                    <span>{title}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="border border-editor-border p-0.5 bg-white shadow-[1px_1px_0_0_#000]"
                >
                    <ChevronDown size={14} className="text-editor-text" />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden bg-white"
                    >
                        <div className="px-4 pb-4 pt-3">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
