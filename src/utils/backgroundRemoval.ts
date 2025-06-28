import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

export interface ProgressCallback {
  (progress: number): void;
}

export async function removeBackgroundWithProgress(
  file: File,
  onProgress?: ProgressCallback
): Promise<Blob> {
  try {
    console.log('Starting background removal...');
    onProgress?.(5);

    // Enhanced progress simulation with more realistic stages
    const progressSteps = [15, 25, 35, 45, 55, 65, 75, 85, 90, 95];
    let currentStep = 0;

    const updateProgressStep = () => {
      if (currentStep < progressSteps.length) {
        onProgress?.(progressSteps[currentStep]);
        currentStep++;
      }
    };

    // Start the actual processing
    updateProgressStep(); // 15%
    console.log('Processing with AI background removal...');
    
    const processingPromise = imglyRemoveBackground(file);
    
    // More realistic progress simulation
    const progressInterval = setInterval(() => {
      updateProgressStep();
    }, 600); // Slightly faster updates

    try {
      const result = await processingPromise;
      clearInterval(progressInterval);
      
      // Ensure we reach 100%
      onProgress?.(100);
      console.log('Background removal completed successfully');
      
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
    
  } catch (error) {
    console.error('Background removal failed:', error);
    throw new Error('Failed to remove background. Please try again with a different image.');
  }
}