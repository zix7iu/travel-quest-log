declare module "react-simple-maps" {
  import type { ComponentType, ReactNode } from "react";

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: { scale?: number; center?: [number, number] };
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  export interface GeographyFeature {
    rsmKey: string;
    [key: string]: unknown;
  }

  export interface GeographiesChildProps {
    geographies: GeographyFeature[];
  }

  export interface GeographiesProps {
    geography: string | object;
    children?: (props: GeographiesChildProps) => ReactNode;
  }

  export interface GeographyProps {
    geography: GeographyFeature;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
}
