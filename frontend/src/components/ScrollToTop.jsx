// Taken from https://www.coderomeos.org/scroll-to-top-of-the-page-a-simple-react-component

import React, { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import "./ScrollToTop.css";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scorlled upto given distance
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Set the top cordinate to 0
  // make scrolling smooth
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <div className="scroll-to-top">
      {isVisible && 
        <div onClick={scrollToTop}>
		  <Button variant="secondary" size="lg"><span style={{position:"relative", bottom:".1em"}}>▲</span> Scroll to top</Button>
        </div>}
    </div>
  );
}
