"""
===========================
Structural similarity index
===========================

When comparing images, the mean squared error (MSE)--while simple to
implement--is not highly indicative of perceived similarity.  Structural
similarity aims to address this shortcoming by taking texture into account
[1]_, [2]_.

The example shows two modifications of the input image, each with the same MSE,
but with very different mean structural similarity indices.

.. [1] Zhou Wang; Bovik, A.C.; ,"Mean squared error: Love it or leave it? A new
       look at Signal Fidelity Measures," Signal Processing Magazine, IEEE,
       vol. 26, no. 1, pp. 98-117, Jan. 2009.

.. [2] Z. Wang, A. C. Bovik, H. R. Sheikh and E. P. Simoncelli, "Image quality
       assessment: From error visibility to structural similarity," IEEE
       Transactions on Image Processing, vol. 13, no. 4, pp. 600-612,
       Apr. 2004.
"""

import json

import numpy as np
from skimage import img_as_float
from skimage.io import imread
from skimage.measure import compare_ssim as ssim

IMAGES_BASE_FILE = 'images/animals_blur_'
FIRST_IMAGE_NUMBER = 1
LAST_IMAGE_NUMBER = 28
OUTPUT_FILE_NAME = './output/similarity_blur.json'


def load_image_as_float(img_number):
    """
    Takes an image from right file and returns it as a float array.
    :param img_number: The image number
    :return: An float array.
    """
    loaded_png = imread(f"{IMAGES_BASE_FILE}{img_number}.png", as_grey=True)
    return img_as_float(loaded_png)


# This is how many images we should load.
number_of_images = LAST_IMAGE_NUMBER - FIRST_IMAGE_NUMBER + 1

# First we get all the images and their max and min dynamic ranges.
images = [None] * number_of_images
# We need to get the max and min data range of all the images pixels.
max_range = None
min_range = None

for x in range(FIRST_IMAGE_NUMBER, LAST_IMAGE_NUMBER + 1):
    image_float = load_image_as_float(x)
    if max_range is None or image_float.max() > max_range:
        max_range = image_float.max()

    if min_range is None or image_float.min() < min_range:
        min_range = image_float.min()

    images[x - FIRST_IMAGE_NUMBER] = image_float

# Now the similarity matrix in itself, we start everything with zeroes
# and our values should be floats.
similarity_matrix = np.zeros((number_of_images, number_of_images), dtype=np.float)

array_range = range(0, number_of_images)
for x in array_range:
    for y in array_range:
        x_image = images[x]
        y_image = images[y]
        similarity_index = ssim(x_image, y_image, data_range=max_range - min_range)
        similarity_matrix[x, y] = similarity_index

with open(OUTPUT_FILE_NAME, 'w') as outfile:
    json.dump(similarity_matrix.tolist(), outfile)
