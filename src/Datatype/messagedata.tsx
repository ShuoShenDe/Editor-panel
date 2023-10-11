export class MyPose {
  public position: { x: number; y: number; z: number };
  public orientation: { w: number; x: number; y: number; z: number };

  constructor(data: {
    pose: {
      position: { x: number; y: number; z: number };
      orientation: { w: number; x: number; y: number; z: number };
    };
  }) {
    this.position = data.pose.position;
    this.orientation = data.pose.orientation;
  }
}
