import React from "react";
import { Engine, Scene } from "react-babylonjs";
import { Vector3, HemisphericLight, ArcRotateCamera, MeshBuilder } from "@babylonjs/core";

const App: React.FC = () => {
  return (
    <Engine canvasId="babylon-canvas" adaptToDeviceRatio antialias>
      <Scene>
        
        {/* Camera */}
        <arcRotateCamera
          name="camera"
          target={new Vector3(0, 0, 0)}
          alpha={Math.PI / 2}
          beta={Math.PI / 2}
          radius={6}
        />

        {/* Light */}
        <hemisphericLight
          name="light"
          intensity={0.8}
          direction={new Vector3(0, 1, 0)}
        />

        {/* Sphere */}
        <sphere
          name="sphere"
          diameter={2}
          segments={16}
          position={new Vector3(0, 1, 0)}
        />

        {/* Ground */}
        <ground
          name="ground"
          width={10}
          height={10}
        />

      </Scene>
    </Engine>
  );
};

export default App;
