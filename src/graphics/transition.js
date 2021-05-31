import { easeInOut, sigmoid } from '../index';
import { math, rtv } from '../resources';
import Text from '../tools/text';

export default function Transition() {
  this.steps = 0;
  this.step = 0;
  this.transitioning = false;
  this.target_frame = 0;

  this.run = (steps, targetFrame, completion) => {
    if (this.transitioning) {
      return;
    }

    rtv.t_percent = 0.0;
    rtv.t_ease = 0.0;
    rtv.t_in_out = 1.0;
    this.steps = steps;
    this.target_frame = targetFrame;
    this.transitioning = true;
    this.completion = completion;
  };

  this.update = () => {
    if (this.transitioning) {
      this.step += 1;
      rtv.t_percent = this.step / this.steps;
      rtv.t_in_out = -math.cos(rtv.t_percent * 2 * math.PI - math.PI) / 2 + 0.5;
      Text.setVariable('_t', rtv.t_percent);
      rtv.t_ease = easeInOut(rtv.t_percent);
      Text.setVariable('_tt', rtv.t_ease);
      rtv.t_ease = sigmoid(rtv.t_percent, 1.2, -0.4, 14) - sigmoid(rtv.t_percent, 0.2, -0.6, 15);
      if (this.step >= this.steps) {
        rtv.t_percent = 1.0;
        rtv.t_in_out = 1.0;
        rtv.t_ease = 1.0;
        this.completion(this.target_frame);
        this.step = 0;
        this.transitioning = false;
      }
    }
  };
}
