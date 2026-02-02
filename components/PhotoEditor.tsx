'use client';

import React from 'react';
import TopBar from './TopBar';
import Canvas from './Canvas';
import RightSidebar from './RightSidebar';
import ExportModal from './ExportModal';

export default function PhotoEditor() {
    return (
        <div className="flex flex-col h-screen bg-editor-bg">
            <TopBar />
            <div className="flex flex-1 overflow-hidden">
                <Canvas />
                <RightSidebar />
            </div>
            <ExportModal />
        </div>
    );
}
