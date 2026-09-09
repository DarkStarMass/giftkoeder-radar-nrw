import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onFail: () => void;
};

type State = { failed: boolean };

export class MapGuard extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
