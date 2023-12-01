/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable react-hooks/exhaustive-deps */
import { Immutable, MessageEvent, PanelExtensionContext, Topic } from "@foxglove/studio";
import { useEffect, useLayoutEffect, useState } from "react";
import ReactDOM from "react-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

import { MyPose } from "./Datatype/messagedata";

let cameraPersp: THREE.PerspectiveCamera,
  currentCamera: THREE.PerspectiveCamera,
  cameraOrtho: THREE.OrthographicCamera;
const aspect = window.innerWidth / window.innerHeight;
// eslint-disable-next-line prefer-const
cameraPersp = new THREE.PerspectiveCamera(50, aspect, 0.01, 30000);
// eslint-disable-next-line @typescript-eslint/no-unused-vars, prefer-const
currentCamera = cameraPersp;
// eslint-disable-next-line prefer-const
cameraOrtho = new THREE.OrthographicCamera(-600 * aspect, 600 * aspect, 600, -600, 0.01, 30000);
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const orbit = new OrbitControls(currentCamera, renderer.domElement);
orbit.update();
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
orbit.addEventListener("change", render);

function ExamplePanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [topics, setTopics] = useState<undefined | Immutable<Topic[]>>();
  const [messages, setMessages] = useState<undefined | Immutable<MessageEvent[]>>();

  const [renderDone, setRenderDone] = useState<(() => void) | undefined>();

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer.setSize(window.innerWidth, window.innerHeight);

  currentCamera.position.set(5, 2.5, 5);
  scene.add(new THREE.GridHelper(100, 100, 0x888888, 0x444444));
  window.addEventListener("resize", onWindowResize);

  const container = document.getElementById("renderer-container");
  if (container) {
    container.appendChild(renderer.domElement);
    console.log("container appended");
  }

  // We use a layout effect to setup render handling for our panel. We also setup some topic subscriptions.
  useLayoutEffect(() => {
    // The render handler is run by the broader studio system during playback when your panel
    // needs to render because the fields it is watching have changed. How you handle rendering depends on your framework.
    // You can only setup one render handler - usually early on in setting up your panel.
    //
    // Without a render handler your panel will never receive updates.
    //
    // The render handler could be invoked as often as 60hz during playback if fields are changing often.
    context.onRender = (renderState, done) => {
      // render functions receive a _done_ callback. You MUST call this callback to indicate your panel has finished rendering.
      // Your panel will not receive another render callback until _done_ is called from a prior render. If your panel is not done
      // rendering before the next render call, studio shows a notification to the user that your panel is delayed.
      //
      // Set the done callback into a state variable to trigger a re-render.
      setRenderDone(() => done);

      // We may have new topics - since we are also watching for messages in the current frame, topics may not have changed
      // It is up to you to determine the correct action when state has not changed.
      setTopics(renderState.topics);

      // currentFrame has messages on subscribed topics since the last render call
      setMessages(renderState.currentFrame);
    };

    // After adding a render handler, you must indicate which fields from RenderState will trigger updates.
    // If you do not watch any fields then your panel will never render since the panel context will assume you do not want any updates.

    // tell the panel context that we care about any update to the _topic_ field of RenderState
    context.watch("topics");

    // tell the panel context we want messages for the current frame for topics we've subscribed to
    // This corresponds to the _currentFrame_ field of render state.
    context.watch("currentFrame");

    // subscribe to some topics, you could do this within other effects, based on input fields, etc
    // Once you subscribe to topics, currentFrame will contain message events from those topics (assuming there are messages).
    context.subscribe([{ topic: "/ld_object_lists" }]);
    console.log(topics);
  }, [context]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const firstMessage = messages[0];
      const myObjects = (
        firstMessage?.message as {
          objects: {
            pose: MyPose;
          }[];
        }
      ).objects;
      // Clear the scene before rendering new boxes
      scene.clear();

      myObjects.forEach((objectData: { pose: MyPose }) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const pose = objectData.pose;
        console.log(pose);
        // Create a BoxGeometry
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);

        // Set the position and rotation based on the pose data
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        box.position.set(pose.position.x, pose.position.y, pose.position.z);
        // Add the box to the group

        // Add transformer controls
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const control = new TransformControls(currentCamera, renderer.domElement);
        control.addEventListener("change", render);
        control.showZ = true;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        control.addEventListener("dragging-changed", (event) => {
          if (typeof event.value === "boolean") {
            console.log("control drag listen", !event.value);
            orbit.enabled = !event.value;
          }
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        });
        control.setMode("translate");
        control.setSize(0.3);
        scene.add(box);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        control.attach(box);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        scene.add(control);
        window.addEventListener("keydown", (event) => {
          switch (event.keyCode) {
            case 87: // W
              control.setMode("translate");
              break;
            case 69: // E
              control.setMode("rotate");
              break;
            case 82: // R
              control.setMode("scale");
              break;
            case 67: // C
              orbit.enabled = !orbit.enabled;
              console.log("orbit enabled", orbit.enabled);
              break;
          }
        });
      });
      console.log("scene added");
      // Render the scenec
      renderer.render(scene, currentCamera);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      renderer.domElement.addEventListener(
        "webglcontextlost",
        (event: { preventDefault: () => void }) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          event.preventDefault(); // 阻止默认行为，防止浏览器尝试自动恢复上下文
          // 在这里处理上下文丢失，重新创建WebGL资源
        },
        false,
      );
    }
  }, [camera, messages, renderer, scene]);

  // invoke the done callback once the render is complete
  useEffect(() => {
    renderDone?.();
  }, [renderDone]);
  // Check if messages exist and have at least one message before logging the first message

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Here is the Editor panel</h2>
      {/* Add a container for the WebGLRenderer */}
      <div id="renderer-container" style={{ width: "100%", height: "500px" }}></div>
    </div>
  );
}

export function initExamplePanel(context: PanelExtensionContext): () => void {
  ReactDOM.render(<ExamplePanel context={context} />, context.panelElement);
  // Return a function to run when the panel is removed
  return () => {
    ReactDOM.unmountComponentAtNode(context.panelElement);
  };
}

function onWindowResize() {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const aspect = window.innerWidth / window.innerHeight;
  cameraPersp.aspect = aspect;
  cameraPersp.updateProjectionMatrix();

  cameraOrtho.left = cameraOrtho.bottom * aspect;
  cameraOrtho.right = cameraOrtho.top * aspect;
  cameraOrtho.updateProjectionMatrix();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function render() {
  renderer.render(scene, currentCamera);
}
