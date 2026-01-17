openprotein
===========

This document describes the base dataclasses and primitives for working with the platform.

This includes the :py:class:`~openprotein.OpenProtein` session object, as well as primitives like the :py:class:`~openprotein.Protein` and :py:class:`~openprotein.Model` objects.

Session
-------

Create an authorized session to OpenProtein.AI backend. 

.. autofunction:: openprotein.connect

.. autoclass:: openprotein.OpenProtein
   :members:
   :class-doc-from: class
   :exclude-members: request

