# Style References

- Manga reference: https://github.com/yuikoito/manga-backend
- Cartoon reference: https://github.com/SystemErrorWang/White-box-Cartoonization
- Ghibli-style reference: https://github.com/TheAppWizard/GhibliArt

The local backend implements practical OpenCV pipelines for Manga and Cartoon. Ghibli mode routes to Stability AI's hosted Stable Diffusion image-to-image API by default, with the previous Colab-style Diffusers flow retained behind `GHIBLI_BACKEND=diffusion`.
