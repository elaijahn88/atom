import React, { useEffect, useRef } from "react";
import { View } from "react-native";

import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
} from "babylonjs";

export default function App() {
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Engine
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    // Camera
    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 2.5,
      10,
      new Vector3(0, 1, 0),
      scene
    );
    camera.attachControl(canvas, true);

    // Light
    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Ground
    const ground = MeshBuilder.CreateGround(
      "ground",
      { width: 20, height: 20 },
      scene
    );

    // Sphere (player placeholder)
    const sphere = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 2 },
      scene
    );
    sphere.position.y = 1;

    // Simple animation
    scene.onBeforeRenderObservable.add(() => {
      sphere.rotation.y += 0.01;
    });

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Resize
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.dispose();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}
