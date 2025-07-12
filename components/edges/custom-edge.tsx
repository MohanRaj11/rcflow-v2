"use client";

import { useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from 'reactflow';
import { EdgePopup } from './edge-popup';

interface CustomEdgeData {
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed';
  animated?: boolean;
  showArrow?: boolean;
  bidirectional?: boolean;
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
}: EdgeProps<CustomEdgeData>) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const { setEdges, getEdges } = useReactFlow();
  const edgeRef = useRef<SVGPathElement>(null);

  // Use smooth bezier curves
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Don't close if clicking inside the popup
      if (target.closest(`[data-edge-popup-id="${id}"]`)) {
        return;
      }
      
      // Don't close if clicking on this edge
      if (target.closest(`[data-edge-id="${id}"]`)) {
        return;
      }
      
      // Close popup
      if (showPopup) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPopup, id]);

  // Listen for global popup close events
  useEffect(() => {
    const handleGlobalPopupClose = (event: CustomEvent) => {
      const exceptEdgeId = event.detail?.exceptEdgeId;
      if (exceptEdgeId !== id && showPopup) {
        setShowPopup(false);
      }
    };

    document.addEventListener('closeAllPopups', handleGlobalPopupClose as EventListener);
    return () => {
      document.removeEventListener('closeAllPopups', handleGlobalPopupClose as EventListener);
    };
  }, [id, showPopup]);

  const handleEdgeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    console.log('Edge clicked!', id); // Debug log
    
    // Close other popups first
    const popupCloseEvent = new CustomEvent('closeAllPopups', { detail: { exceptEdgeId: id } });
    document.dispatchEvent(popupCloseEvent);
    
    // Get click position relative to viewport
    const rect = (event.target as Element).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    console.log('Popup position:', { x, y }); // Debug log
    
    setPopupPosition({ x, y });
    setShowPopup(true);
  };

  const updateEdgeData = (updates: Partial<CustomEdgeData>) => {
    const edges = getEdges();
    const updatedEdges = edges.map(edge => 
      edge.id === id 
        ? { ...edge, data: { ...edge.data, ...updates } }
        : edge
    );
    setEdges(updatedEdges);
  };

  const handleDelete = () => {
    const edges = getEdges();
    const updatedEdges = edges.filter(edge => edge.id !== id);
    setEdges(updatedEdges);
    setShowPopup(false);
  };

  // Default edge styling
  const strokeColor = data?.strokeColor || '#70f';
  const strokeWidth = data?.strokeWidth || 2;
  const strokeStyle = data?.strokeStyle || 'dashed';
  const animated = data?.animated !== false;
  const showArrow = data?.showArrow || false;
  const bidirectional = data?.bidirectional || false;

  const edgeStyle = {
    stroke: strokeColor,
    strokeWidth,
    strokeDasharray: strokeStyle === 'dashed' ? '8,4' : 'none',
    ...style,
  };

  // Arrow marker IDs
  const forwardMarkerId = `arrow-forward-${id}`;
  const backwardMarkerId = `arrow-backward-${id}`;

  return (
    <>
      <defs>
        {/* Forward arrow */}
        <marker
          id={forwardMarkerId}
          markerWidth="12"
          markerHeight="12"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0,0 0,6 9,3"
            fill={strokeColor}
            stroke={strokeColor}
            strokeWidth="1"
          />
        </marker>
        
        {/* Backward arrow */}
        <marker
          id={backwardMarkerId}
          markerWidth="12"
          markerHeight="12"
          refX="3"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="9,0 9,6 0,3"
            fill={strokeColor}
            stroke={strokeColor}
            strokeWidth="1"
          />
        </marker>
      </defs>
      
      {/* Clickable invisible path */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        style={{
          cursor: 'pointer',
          pointerEvents: 'stroke',
        }}
        onClick={handleEdgeClick}
        data-edge-id={id}
      />
      
      {/* Visible edge path */}
      <BaseEdge
        path={edgePath}
        style={{
          ...edgeStyle,
          markerEnd: showArrow ? `url(#${forwardMarkerId})` : 'none',
          markerStart: (showArrow && bidirectional) ? `url(#${backwardMarkerId})` : 'none',
          filter: selected ? `drop-shadow(0 0 6px ${strokeColor})` : 'none',
          pointerEvents: 'none',
        }}
        className={`react-flow__edge-path ${selected ? 'selected' : ''} ${animated ? 'animated-edge' : ''}`}
      />

      {/* Edge Popup */}
      {showPopup && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'fixed',
              left: popupPosition.x,
              top: popupPosition.y - 60,
              transform: 'translateX(-50%)',
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
          >
            <EdgePopup
              edgeId={id}
              edgeData={data || {}}
              onClose={() => setShowPopup(false)}
              onUpdateData={updateEdgeData}
              onDelete={handleDelete}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}