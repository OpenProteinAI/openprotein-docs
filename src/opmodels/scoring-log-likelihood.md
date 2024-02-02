---
title: OP Models Scoring and Log-likelihood
format:
  html:
    code-fold: true
---

OpenProtein.AI uses Bayesian property predictors, which output a distribution over possible values of the property for a variant. The mean, or most likely value of the property for the sequence as predicted by the model, is what you would get from a typical regression model. The models also output a standard deviation indicating their certainty in the value of that property. OpenProtein.AI uses this distribution to calculate the probability that a sequence variant meets a given criteria, then expresses it as a log-likelihood score. The higher or less negative the score is, the more fit the sequence.

Some tools return a heatmap, where each site has a log-likelihood score and a color to indicate increased or decreased fitness relative to the sequence being analyzed.

- Blue indicates improved fitness.
- Red indicates reduced fitness. 

A site which is all white indicates that a mutation at that site would not impact fitness.

In order for the colors to indicate improved or reduced fitness in relation to your design objective, the direction of the objective ( <x, >x, or =x) must be specified. The default setting is <x, but you can adjust this in the Show heatmap options tab. 
