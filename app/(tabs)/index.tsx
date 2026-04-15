import React from "react";
import { View } from "react-native";
import { GLView } from "expo-gl";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  MeshBuilder,
} from "@babylonjs/core";

export default function App() {
  const onContextCreate = async (gl) => {
    // Create Babylon engine using Expo GL context
    const engine = new Engine(gl, true);
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
    camera.attachControl(true);

    // Light
    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Ground
    MeshBuilder.CreateGround(
      "ground",
      { width: 20, height: 20 },
      scene
    );

    // Sphere
    const sphere = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 2 },
      scene
    );
    sphere.position.y = 1;

    // Animation
    scene.onBeforeRenderObservable.add(() => {
      sphere.rotation.y += 0.02;
    });

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
      gl.endFrameEXP(); // VERY IMPORTANT for APK
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}
