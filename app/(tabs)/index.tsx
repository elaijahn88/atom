import React from "react";
import { View } from "react-native";
import { GLView } from "expo-gl";

import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  ShadowGenerator,
  SceneLoader,
} from "@babylonjs/core";

import "@babylonjs/loaders";

export default function App() {
  const onContextCreate = async (gl) => {
    try {
      // ✅ Correct engine setup for Expo
      const engine = new Engine(gl, true);

      const scene = new Scene(engine);

      // ✅ Background
      scene.clearColor = new Color3(0.6, 0.8, 1);

      // ✅ Camera (NO attachControl in RN)
      const camera = new ArcRotateCamera(
        "camera",
        Math.PI / 2,
        Math.PI / 3,
        10,
        new Vector3(0, 1, 0),
        scene
      );

      // ✅ Lights
      new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);

      const dirLight = new DirectionalLight(
        "dir",
        new Vector3(-1, -2, -1),
        scene
      );
      dirLight.position = new Vector3(10, 10, 10);

      const shadowGenerator = new ShadowGenerator(1024, dirLight);

      // ✅ Ground
      const ground = MeshBuilder.CreateGround(
        "ground",
        { width: 20, height: 20 },
        scene
      );

      const gmat = new StandardMaterial("gmat", scene);
      gmat.diffuseColor = new Color3(0.3, 0.7, 0.3);
      ground.material = gmat;
      ground.receiveShadows = true;

      // ✅ Debug box (always renders)
      const box = MeshBuilder.CreateBox("box", { size: 2 }, scene);
      box.position.y = 1;
      shadowGenerator.addShadowCaster(box);

      // ✅ Safe model loading (optional)
      SceneLoader.ImportMeshAsync(
        "",
        "https://models.babylonjs.com/",
        "BoomBox.glb",
        scene
      )
        .then((result) => {
          result.meshes.forEach((m) => {
            m.position.y = 1;
            m.scaling = new Vector3(10, 10, 10);
            shadowGenerator.addShadowCaster(m);
          });
        })
        .catch((e) => console.log("Model failed:", e));

      // ✅ Render loop (CRITICAL FIX)
      engine.runRenderLoop(() => {
        scene.render();
        gl.endFrameEXP();
      });

    } catch (err) {
      console.log("Crash error:", err);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
}
