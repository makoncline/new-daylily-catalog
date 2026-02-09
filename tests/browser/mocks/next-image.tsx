import React from "react";

interface NextImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  unoptimized?: boolean;
  priority?: boolean;
}

const NextImage = React.forwardRef<HTMLImageElement, NextImageProps>(
  function NextImage(
    { src, alt, unoptimized: _unoptimized, priority: _priority, ...props },
    ref,
  ) {
    return <img ref={ref} src={src} alt={alt} {...props} />;
  },
);

export default NextImage;
