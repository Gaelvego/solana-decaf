import Image from "next/image";
import React from "react";

interface LogoProps {
  children?: React.ReactNode;
}

const Logo: React.FC<LogoProps> = () => {
  return <Image src="/logo.png" alt="Logo" width="300" height="200" />;
};

export default Logo;
