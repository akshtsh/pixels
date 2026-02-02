'use client';

import React from 'react';
import AIToolsPanel from './panels/AIToolsPanel';
import LightPanel from './panels/LightPanel';
import ColorPanel from './panels/ColorPanel';
import DetailPanel from './panels/DetailPanel';
import EffectsPanel from './panels/EffectsPanel';
import GeometryPanel from './panels/GeometryPanel';

export default function RightSidebar() {
    return (
        <aside className="w-72 bg-editor-surface border-l border-editor-border overflow-y-auto flex-shrink-0">
            <div className="py-2">
                <AIToolsPanel />
                <div className="h-px bg-editor-border my-2 mx-4" />
                <LightPanel />
                <ColorPanel />
                <DetailPanel />
                <EffectsPanel />
                <GeometryPanel />
            </div>
        </aside>
    );
}
