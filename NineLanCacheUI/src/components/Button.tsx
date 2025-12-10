import React, { useState } from "react";

interface ButtonProps {
  type?: "button" | "submit" | "reset";
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  style?: React.CSSProperties;
  // Optional props to override default colors
  defaultColor?: string;
  hoverColor?: string;
}

const Button: React.FC<ButtonProps> = ({
  type = "button",
  className = "",
  children,
  onClick,
  disabled = false,
  style,
  defaultColor = "#4CAF50",
  hoverColor = "#2E7D32",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const combinedStyle: React.CSSProperties = {
    backgroundColor: disabled ? defaultColor : isHovered ? hoverColor : defaultColor,
    color: "white",
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background-color 0.2s ease",
    ...style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={combinedStyle}
      className={`py-2 rounded transition cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
};

export default Button;
