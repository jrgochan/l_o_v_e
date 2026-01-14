"use client";

import { useRef, useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useWaypointPulse } from "./useWaypointPulse";

interface WaypointMarkerProps {
    position: [number, number, number];
    emotionName: string;
    categoryColor: string;
    isHighlighted: boolean;
    mode: "subtle" | "dynamic" | "mystical";
    opacity: number;
}

export function WaypointMarker({
    position,
    emotionName,
    categoryColor,
    isHighlighted,
    mode,
    opacity,
}: WaypointMarkerProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
    const setHoveredEmotion = useAtlasAdminStore((state) => state.setHoveredEmotion);

    const color = useMemo(() => {
        return new THREE.Color(categoryColor);
    }, [categoryColor]);

    // Find the full emotion data for this waypoint
    const emotion = useMemo(() => {
        return allEmotions.find((e) => e.name === emotionName);
    }, [allEmotions, emotionName]);

    useWaypointPulse(meshRef, mode);

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (emotion) {
            setHoveredEmotion(emotion.id);
        }
        document.body.style.cursor = "pointer";
    };

    const handlePointerOut = () => {
        setHoveredEmotion(null);
        document.body.style.cursor = "auto";
    };

    return (
        <mesh
            ref={meshRef}
            data-testid="waypoint-marker"
            position={position}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHighlighted ? 2.0 : 1.0}
                transparent
                opacity={opacity}
            />
        </mesh>
    );
}
