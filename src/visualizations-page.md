---
format:
  html:
    code-fold: true
---

# Visualizations

OpenProtein offers a suite of visualizations which also allows
customizations: 

* UMAP 
* Joint plot

## UMAP

The UMAP creates a 2D visualization of the manifold of your sequence
variants, using a low-dimensional embedding technique to represent each
variant sequence in two dimensions based on their similarities in the
high-dimensional feature space. Each point in the visualization
represents a single sequence variant.

![](/main_tutorial_images/10_umap.png)

The points are colored by their corresponding property values in your
dataset. The "UMAP options" panel allows you to change the color scheme,
reverse the color scheme, and toggle between multiple properties.

## Joint plot 

You can explore your dataset by selecting properties to
view a joint plot that depicts the pairwise relationships between them.
The joint plot provides a visual representation of the distribution of
individuals of each variable and helps in understanding the relationship
between two variables.

![](/main_tutorial_images/11_jp.png)