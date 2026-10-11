"use client";

import { useEffect } from "react";

export function FadeInObserver() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".fade-in").forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      // threshold 0 fires as soon as ANY part of the element is visible. A
      // higher threshold breaks very tall sections (e.g. the single-column
      // product page on mobile): their visible ratio can never reach the
      // threshold, so they stay stuck at opacity:0 (a blank page).
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );

    const observeAll = () => {
      document.querySelectorAll(".fade-in:not(.visible)").forEach((el) => observer.observe(el));
    };

    observeAll();

    const mutation = new MutationObserver(() => observeAll());
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  return null;
}
