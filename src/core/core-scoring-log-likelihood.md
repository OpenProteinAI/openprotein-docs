---
title: Core Workflow scoring and log-likelihood
format:
  html:
    code-fold: true
---

OpenProtein.AI uses Bayesian property predictors, which output a distribution over possible values of the property for a variant. The mean, or most likely value of the property for the sequence as predicted by the model, is what you would get from a typical regression model. The models also output a standard deviation indicating their certainty in the value of that property. OpenProtein.AI uses this distribution to calculate the probability that a sequence variant meets a given criteria and expresses it as a log-likelihood score.

The higher the score is, the more fit the sequence:

- A positive number indicates an improvement in fitness.

- 0 indicates equivalent fitness.
- A negative number indicates less fitness.

Some tools return a heatmap, where each site has a relative log-likelihood score. This score indicates increased or decreased fitness relative to the wildtype. Hover over a site on the heatmap to view the relative log-likelihood score.