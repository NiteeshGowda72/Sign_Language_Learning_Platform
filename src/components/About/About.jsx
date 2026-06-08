import React from "react";
import { WhatComp, Features, Working, CTA } from "../index";
import "./About.css";

const About = () => {
  return (
    <div className="about-container">
      {/* Main Content - Previous Home Page Components (without Header) */}
      <div className="about-main-content">
        <WhatComp />
        <Features />
        <Working />
        <CTA />
      </div>
    </div>
  );
};

export default About;
