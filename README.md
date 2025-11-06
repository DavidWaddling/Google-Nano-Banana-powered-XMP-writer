# Google-Nano-Banana-powered-XMP-writer
The purpose of this app is to take an image files (photos) that you have created and plan on editing and assist you with the inbedded information.

When you import images into Lightroom (I'll use that as an example) you don't just edit the image lighting, cropping, and so on, you also get to add other information to the file. 
This includes: 
  1. Title
  2. Description (50 words or less (Gemini was getting a bit wordy))
  3. Keywords (Set at 20)
  4. Location (GPS co ordinance)
This software allows you to drag and drop up to 5 images into a dialogue box. NOTE images should be under 2MB in size, the bigger the files the more $ incured. I processed 30 image files for about $0.01.
Enter the location or landmark for the images (ie: Toronto or Niagara Falls)
Submitting the images will instruct Gemini to analyse each photo, create the four elements listed above, and output them to a valid image sidecar file. This file will be named the same as your image file with a .xmp extension and can be downloaded to your system.

If you put this file in the same directory as the original raw file you imported from your camera you can add the info to your image in Lightroom by opening the image you want to update, click metafile - Read metadata from file.

Enjoy.
Dave

SETUP
This app is made available with no warranty. 
For this app to work you will need to complete a couple of things.
1. I'd suggest you sign up for Google's AI Studio so that you can easily complete the needed steps.
2. Download my Repo
3. Import it into AI studio
4. Use AI Studio to create your own API key (cuz you're not using mine!) You will need to set up billing too. 
5. Find the .env file in the project root and edit the GEMINI_API_KEY="your_actual_private_key" with your key
6. Save it and test it in preview
7. Deploy it to a new Google cloud project of your very own.
