---
title: PoET Scoring and Log-likelihood
format:
  html:
    code-fold: true
---

PoET learns to estimate the gradient of the log-likelihood density function and returns a log-likelihood score. By not estimating the probability densities, the model avoids the need to calculate the normalization constant of the distribution. This results in improved computational efficiency and scales better to high-dimensional data. 

## Log-likelihood scores
The log-likelihood score quantifies the model’s level of confidence in the generated sequence. 
Scoring is consistent for the same prompt. We don’t recommend comparing scores across different prompts. The higher or less negative the score is, the more fit the sequence.

## Relative scores
Some tools return a heatmap, where each site has a relative log-likelihood score. This score indicates increased or decreased fitness relative to the sequence being analyzed. Hover over a site on the heatmap to view the relative log-likelihood score.

The heatmap colors indicate how a mutation at that site would impact the fitness of a variant:

- Blue indicates improved fitness (relative log-likelihood score > 0)
- Red indicates reduced fitness (relative log-likelihood score < 0) 

An entirely white site (relative log-likelihood score = 0) indicates that a mutation there would not impact function.

