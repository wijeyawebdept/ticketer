/**
 * Banner Validation Service
 * Validates banner images for optimal display across all viewports
 */

export interface BannerValidationResult {
  isValid: boolean;
  width: number;
  height: number;
  aspectRatio: number;
  issues: BannerIssue[];
  recommendations: string[];
}

export interface BannerIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// Recommended dimensions for hero banners
const RECOMMENDED_DIMENSIONS = {
  primary: { width: 1920, height: 800, name: '1920×800px (Recommended)' },
  alternative1: { width: 1920, height: 600, name: '1920×600px (Wide)' },
  alternative2: { width: 1920, height: 900, name: '1920×900px (Tall)' },
};

const MINIMUM_WIDTH = 1280; // Minimum width for desktop display
const ASPECT_RATIO_TOLERANCE = 0.1; // 10% tolerance for aspect ratio
const SAFE_ZONE_MARGIN = 120; // Safe zone margin in pixels (15% of 800px height)

/**
 * Validates a banner image file for optimal dimensions and aspect ratio
 * @param file The image file to validate
 * @returns Promise with validation results
 */
export async function validateBannerImage(
  file: File
): Promise<BannerValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const validation = checkImageDimensions(img.width, img.height);
        resolve(validation);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image. Please ensure the file is a valid image.'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file. Please try again.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Checks if image dimensions meet banner requirements
 */
function checkImageDimensions(
  width: number,
  height: number
): BannerValidationResult {
  const issues: BannerIssue[] = [];
  const recommendations: string[] = [];
  const aspectRatio = width / height;

  // Check minimum width
  if (width < MINIMUM_WIDTH) {
    issues.push({
      severity: 'error',
      message: `Image width (${width}px) is below minimum required width (${MINIMUM_WIDTH}px). Banner may appear stretched on desktop.`,
    });
  }

  // Check aspect ratios against recommended dimensions
  const primaryRatio = RECOMMENDED_DIMENSIONS.primary.width / RECOMMENDED_DIMENSIONS.primary.height;
  const alt1Ratio = RECOMMENDED_DIMENSIONS.alternative1.width / RECOMMENDED_DIMENSIONS.alternative1.height;
  const alt2Ratio = RECOMMENDED_DIMENSIONS.alternative2.width / RECOMMENDED_DIMENSIONS.alternative2.height;

  const ratioMatches = [
    { ratio: primaryRatio, name: RECOMMENDED_DIMENSIONS.primary.name, tolerance: ASPECT_RATIO_TOLERANCE },
    { ratio: alt1Ratio, name: RECOMMENDED_DIMENSIONS.alternative1.name, tolerance: ASPECT_RATIO_TOLERANCE },
    { ratio: alt2Ratio, name: RECOMMENDED_DIMENSIONS.alternative2.name, tolerance: ASPECT_RATIO_TOLERANCE },
  ];

  const hasMatchingRatio = ratioMatches.some(
    (match) => Math.abs(aspectRatio - match.ratio) <= match.tolerance
  );

  if (!hasMatchingRatio) {
    issues.push({
      severity: 'warning',
      message: `Aspect ratio (${aspectRatio.toFixed(2)}:1) does not match recommended ratios. Image may not display optimally on all devices.`,
    });
    recommendations.push(
      'Consider using one of the recommended dimensions for best results on all devices.'
    );
  }

  // Add aspect ratio info
  recommendations.push(
    `Optimal aspect ratio range: ${(2.0).toFixed(2)}:1 to ${(3.2).toFixed(2)}:1`
  );

  // Add safe zone information
  recommendations.push(
    `Safe zone: Keep important content within the center ${width - SAFE_ZONE_MARGIN * 2}×${height}px area to ensure visibility on mobile devices.`
  );

  // Add responsive behavior info
  recommendations.push(
    `On mobile (${MINIMUM_WIDTH}px width), banner height will scale proportionally with aspect ratio.`
  );

  const isValid = issues.every((issue) => issue.severity !== 'error');

  return {
    isValid,
    width,
    height,
    aspectRatio,
    issues,
    recommendations,
  };
}

/**
 * Gets HTML guidance text for banner dimensions
 */
export function getBannerGuidanceText(): string {
  return `
    <strong>Banner Dimension Guidelines:</strong><br/>
    <strong>Recommended:</strong> 1920×800px (Perfect for hero banners)<br/>
    <strong>Alternatives:</strong> 1920×600px or 1920×900px<br/>
    <strong>Minimum Width:</strong> ${MINIMUM_WIDTH}px (for desktop display)<br/>
    <strong>Safe Zone:</strong> Keep important content in the center area (away from edges)<br/>
    <strong>File Format:</strong> JPG, PNG, or WebP (compressed for fast loading)<br/>
    <strong>Best Practice:</strong> Optimize image size to under 500KB for fast page load.
  `;
}

/**
 * Formats validation results for display
 */
export function formatValidationMessage(result: BannerValidationResult): string {
  let message = `Image dimensions: ${result.width}×${result.height}px (${result.aspectRatio.toFixed(2)}:1)\n\n`;

  if (result.issues.length > 0) {
    message += 'Issues found:\n';
    result.issues.forEach((issue) => {
      message += `• [${issue.severity.toUpperCase()}] ${issue.message}\n`;
    });
  }

  if (result.recommendations.length > 0) {
    message += '\nRecommendations:\n';
    result.recommendations.forEach((rec) => {
      message += `• ${rec}\n`;
    });
  }

  return message;
}
