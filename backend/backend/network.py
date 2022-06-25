from typing import NamedTuple


class SignificanceRow(NamedTuple):
    """ Represents the elements of a significance extration """
    type_: str
    value: str