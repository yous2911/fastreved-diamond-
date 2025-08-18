import React, { useEffect, useState } from 'react';

interface SkipLink {
  id: string;
  label: string;
  target: string;
}

interface SkipLinksProps {
  additionalLinks?: SkipLink[];
  className?: string;
}

const SkipLinks: React.FC<SkipLinksProps> = ({ additionalLinks = [], className = '' }) => {
  const [detectedLinks, setDetectedLinks] = useState<SkipLink[]>([]);

  useEffect(() => {
    const detectPageSections = () => {
      const detectedLinks: SkipLink[] = [];
      
      // Common selectors for page sections
      const selectors = [
        'main',
        '[role="main"]',
        '#main',
        '#content',
        'nav',
        '[role="navigation"]',
        '#navigation',
        'header',
        '[role="banner"]',
        'footer',
        '[role="contentinfo"]',
        '.skip-target',
        '[data-skip-target]'
      ];

      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element, index) => {
            const htmlElement = element as HTMLElement;
            if (!htmlElement) return;

            // Check if element is visible and has content
            const rect = htmlElement.getBoundingClientRect();
            const isVisible = rect.height > 0 && rect.width > 0;
            const textContent = htmlElement.textContent;
            const hasContent = (textContent?.trim().length || 0) > 0 || !!htmlElement.querySelector('input, button, a');

            if (isVisible && hasContent) {
              detectedLinks.push({
                id: `skip-${selector.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`,
                label: `Skip to ${selector}`,
                target: `#${htmlElement.id || `skip-target-${Date.now()}-${index}`}`
              });

              // Ensure element has an ID for targeting
              if (!htmlElement.id) {
                htmlElement.id = `skip-target-${Date.now()}-${index}`;
              }
            }
          });
        } catch (error) {
          console.warn(`Error processing selector ${selector}:`, error);
        }
      });

      setDetectedLinks(detectedLinks);
    };

    // Run detection after DOM is ready
    const timer = setTimeout(detectPageSections, 100);
    return () => clearTimeout(timer);
  }, []);

  const allLinks = [
    ...detectedLinks,
    ...additionalLinks
  ];

  const handleSkipClick = (target: string) => {
    try {
      const element = document.querySelector(target);
      if (element) {
        (element as HTMLElement).focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.warn(`Error navigating to ${target}:`, error);
    }
  };

  if (allLinks.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`skip-links ${className}`}>
        <div className="skip-links-container">
          <h2 className="skip-links-title">Skip Navigation</h2>
          <ul className="skip-links-list">
            {allLinks.map((link) => (
              <li key={link.id} className="skip-links-item">
                <button
                  className="skip-links-button"
                  onClick={() => handleSkipClick(link.target)}
                  type="button"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        .skip-links {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 9999;
          background: transparent;
          pointer-events: none;
        }

        .skip-links-container {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          background: #000;
          color: #fff;
          padding: 1rem;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transition: top 0.3s ease;
          pointer-events: auto;
          min-width: 200px;
        }

        .skip-links-container:focus-within {
          top: 0;
        }

        .skip-links-title {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: bold;
          color: #fff;
        }

        .skip-links-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .skip-links-item {
          margin: 0;
          padding: 0;
        }

        .skip-links-button {
          display: block;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: transparent;
          color: #fff;
          border: 1px solid #444;
          border-radius: 4px;
          cursor: pointer;
          text-align: left;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          margin-bottom: 0.25rem;
        }

        .skip-links-button:last-child {
          margin-bottom: 0;
        }

        .skip-links-button:hover,
        .skip-links-button:focus {
          background: #333;
          border-color: #666;
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        .skip-links-button:active {
          background: #555;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .skip-links-container {
            background: #000;
            border: 2px solid #fff;
          }
          
          .skip-links-button {
            border-color: #fff;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .skip-links-container {
            transition: none;
          }
          
          .skip-links-button {
            transition: none;
          }
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .skip-links-container {
            left: 1rem;
            right: 1rem;
            transform: none;
            min-width: auto;
          }
        }
      `}</style>
    </>
  );
};

export default SkipLinks;
