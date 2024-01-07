---
title: PoET scoring and log-likelihood
format:
  html:
    code-fold: true
---

## Explanation

PoET learns to estimate the gradient of the log-likelihood density function and returns a log-likelihood score. By not estimating the probability densities, the model avoids the need to calculate the normalization constant of the distribution. This results in improved computational efficiency and scales better to high-dimensional data.

The log-likelihood score quantifies the model's level of confidence in the generated sequence.

## Log-likelihood scoring

Scoring is consistent for the same prompt. We don't recommend comparing scores across different prompts.

The higher the score is, the more fit the sequence:

- A positive number indicates an improvement in fitness.

- 0 indicates equivalent fitness.
- A negative number indicates less fitness.

Some tools return a heatmap, where each site has a relative log-likelihood score. This score indicates increased or decreased fitness relative to the wildtype. Hover over a site on the heatmap to view the relative log-likelihood score.

The heatmap colors indicate how a mutation at that site would impact the function of a variant:

Deep blue indicates improved function.

Red indicates reduced function.

A site which is all blue indicates that a mutation at that site would not impact function.