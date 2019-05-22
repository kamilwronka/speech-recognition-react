import React, { PureComponent } from "react";

class Input extends PureComponent {
  render() {
    return (
      <input value={this.props.value} onChange={this.props.onInputChange} />
    );
  }
}

export default Input;
