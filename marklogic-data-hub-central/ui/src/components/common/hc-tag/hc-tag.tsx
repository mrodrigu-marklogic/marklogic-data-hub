import React from "react";
import styles from "./hc-tag.module.scss";
import iconCloseTag from "../../../assets/icon_closeTag.svg";

interface Props {
  label: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  className?: string;
  dashed?: boolean;
  color?: string;
  closable?: boolean;
  visible?: boolean;
  onClose?: () => void;
}

const setTagColor = (color: string) => {

  let colorAux = color.toLowerCase();
  let tagColor = "";

  switch (colorAux) {
  case "black":
    tagColor = styles.spanTagBlack;
    break;
  case "blue":
    tagColor = styles.spanTagBlue;
    break;
  case "green":
    tagColor = styles.spanTagGreen;
    break;
  case "grey":
    tagColor = styles.spanTagGrey;
    break;
  case "magenta":
    tagColor = styles.spanTagMagenta;
    break;
  case "red":
    tagColor = styles.spanTagRed;
    break;
  case "yellow":
    tagColor = styles.spanTagYellow;
    break;
  }
  return tagColor;
};

const HCTag: React.FC<Props> = (props) => {
  return (
    <span aria-label={props.ariaLabel}
      data-testid="tag-component"
      className={[styles.spanTag, props.className ? props.className : "", props?.color && setTagColor(props.color),
        props.dashed && styles.spanTagDashed, props.visible === false && styles.spanTagInvisible].join(" ")}
      style={props.style}>
      {props.label}
      {(props?.closable || props?.closable === undefined) &&
        <img src={iconCloseTag} alt={""} data-testid="iconClose-tagComponent" onClick={props?.onClose} className={styles.spanIcon} />
      }
    </span>
  );
};

export default HCTag;